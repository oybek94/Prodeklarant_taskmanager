import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { generateInvoicePDF } from '../services/invoice-pdf';
import { generateInvoiceExcel } from '../services/invoice-excel';
import { Prisma } from '@prisma/client';
import { getNextInvoiceNumber } from '../utils/invoice-number';
import { ensureCmrForInvoice } from '../services/cmr-service';
import { ensureTirForInvoice } from '../services/tir-service';
import fs from 'fs/promises';

const router = Router();

// GET /invoices/next-number?contractId=:id - Shartnoma uchun keyingi invoice raqami (parametrli routelardan oldin)
router.get('/next-number', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const contractIdStr = req.query.contractId;
    const contractId = contractIdStr ? parseInt(String(contractIdStr)) : NaN;
    if (!Number.isFinite(contractId)) {
      return res.status(400).json({ error: 'contractId kerak' });
    }
    const lastInvoice = await prisma.invoice.findFirst({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
    const nextNumber = lastInvoice ? getNextInvoiceNumber(lastInvoice.invoiceNumber) : '1';
    res.json({ nextNumber });
  } catch (error: any) {
    console.error('Error getting next invoice number:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices/check-number?invoiceNumber=:num&contractId=:id&excludeId=:id - Raqam mavjudligini tekshirish (shartnoma bo'yicha)
router.get('/check-number', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const invoiceNumber = String(req.query.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      return res.json({ available: true });
    }
    const contractIdStr = req.query.contractId;
    const excludeIdStr = req.query.excludeId;
    const excludeId = excludeIdStr ? parseInt(String(excludeIdStr)) : undefined;
    const contractId = contractIdStr ? parseInt(String(contractIdStr)) : undefined;
    const whereClause = Number.isFinite(contractId)
      ? { contractId, invoiceNumber }
      : { contractId: null, invoiceNumber };
    const existing = await prisma.invoice.findFirst({
      where: whereClause,
    });
    const available = !existing || (excludeId != null && existing.id === excludeId);
    res.json({ available });
  } catch (error: any) {
    console.error('Error checking invoice number:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices - Barcha invoice'lar
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        client: {
          select: {
            id: true,
            name: true,
          }
        },
        contract: {
          select: {
            sellerName: true,
            buyerName: true,
            consigneeName: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const invoicesWithContract = await Promise.all(invoices.map(async (invoice) => {
      let contract = invoice.contract;
      if (!contract && invoice.contractNumber && invoice.clientId) {
        const found = await prisma.contract.findFirst({
          where: {
            contractNumber: invoice.contractNumber,
            clientId: invoice.clientId,
          },
          select: { sellerName: true, buyerName: true, consigneeName: true },
        });
        if (found) contract = found;
      }
      return {
        ...invoice,
        contract,
        totalAmount: Number(invoice.totalAmount),
        items: invoice.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          packagesCount: item.packagesCount != null ? Number(item.packagesCount) : null,
          grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
          netWeight: item.netWeight ? Number(item.netWeight) : null,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }))
      };
    }));
    res.json(invoicesWithContract);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// Invoice yaratish/update uchun schema
const invoiceSchema = z.object({
  taskId: z.number().optional(),
  clientId: z.number().optional(),
  invoiceNumber: z.string().optional(),
  contractNumber: z.string().optional(),
  contractId: z.number().optional(),
  date: z.string().optional(),
  currency: z.enum(['USD', 'UZS']).optional(),
  totalAmount: z.number().optional(),
  notes: z.string().optional(),
  additionalInfo: z.any().optional(),
  items: z.array(z.object({
    tnvedCode: z.string().optional().nullable().transform(v => v ?? undefined),
    pluCode: z.string().optional().nullable().transform(v => v ?? undefined),
    name: z.string(),
    packageType: z.string().optional().nullable().transform(v => v ?? undefined),
    unit: z.string(),
    quantity: z.number(),
    packagesCount: z.number().optional().nullable().transform(v => v ?? undefined),
    grossWeight: z.number().optional(),
    netWeight: z.number().optional(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    orderIndex: z.number().optional(),
  })).optional(),
}).refine((data) => data.taskId || data.clientId, {
  message: "taskId yoki clientId bo'lishi kerak",
});

// GET /invoices/client/:clientId - Mijozning barcha invoice'lari
router.get('/client/:clientId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const invoices = await prisma.invoice.findMany({
      where: { clientId },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices.map(invoice => ({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      items: invoice.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        packagesCount: item.packagesCount != null ? Number(item.packagesCount) : null,
        grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
        netWeight: item.netWeight ? Number(item.netWeight) : null,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      }))
    })));
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices/task/:taskId - Task uchun invoice (yo'q bo'lsa 200 + null)
router.get('/task/:taskId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    const invoice = await prisma.invoice.findUnique({
      where: { taskId },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        client: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!invoice) {
      return res.status(200).json(null);
    }

    res.json({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      items: invoice.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        packagesCount: item.packagesCount != null ? Number(item.packagesCount) : null,
        grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
        netWeight: item.netWeight ? Number(item.netWeight) : null,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      }))
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices/:id - Invoice ma'lumotlari
router.get('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        client: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    res.json({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      items: invoice.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        packagesCount: item.packagesCount != null ? Number(item.packagesCount) : null,
        grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
        netWeight: item.netWeight ? Number(item.netWeight) : null,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      }))
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /invoices - Yangi invoice yaratish yoki mavjudni yangilash
router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstFieldError = Object.values(flat.fieldErrors as Record<string, string[]>).flat()[0];
      const firstFormError = flat.formErrors[0];
      const errMsg = firstFieldError || firstFormError || 'Ma\'lumotlarda xatolik';
      return res.status(400).json({ error: errMsg });
    }

    const { taskId, clientId, invoiceNumber, contractNumber, contractId, date, currency, totalAmount, notes, additionalInfo, items } = parsed.data;

    // Task va Client ma'lumotlarini olish
    let task: any = null;
    let client: any = null;
    let branchId: number | undefined = undefined;

    if (taskId) {
      task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { client: true }
      });

      if (!task) {
        return res.status(404).json({ error: 'Task topilmadi' });
      }

      client = task.client;
      branchId = task.branchId;
    } else if (clientId) {
      client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({ error: 'Mijoz topilmadi' });
      }

      // ClientId bo'lsa, branchId ni olish uchun birinchi taskni topish yoki default branch qo'llash
      const firstTask = await prisma.task.findFirst({
        where: { clientId },
        select: { branchId: true }
      });
      branchId = firstTask?.branchId || undefined;
    } else {
      return res.status(400).json({ error: 'taskId yoki clientId bo\'lishi kerak' });
    }

    // Mavjud invoice'ni tekshirish
    const existingInvoice = taskId 
      ? await prisma.invoice.findUnique({
          where: { taskId }
        })
      : null;

    let invoice;

    if (existingInvoice) {
      // Mavjud invoice'ni yangilash
      const finalInvoiceNumber = invoiceNumber || existingInvoice.invoiceNumber;
      
      // Invoice raqami o'zgargan bo'lsa, shartnoma bo'yicha unique tekshirish
      if (invoiceNumber && invoiceNumber !== existingInvoice.invoiceNumber) {
        const dupWhere = contractId
          ? { contractId, invoiceNumber: invoiceNumber }
          : { contractId: null, invoiceNumber: invoiceNumber };
        const duplicateInvoice = await prisma.invoice.findFirst({
          where: dupWhere,
        });
        if (duplicateInvoice && duplicateInvoice.id !== existingInvoice.id) {
          return res.status(400).json({ error: 'Bu invoice raqami allaqachon mavjud. Ozgartirish kerak' });
        }
      }
      
      // Eski itemlarni o'chirish
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: existingInvoice.id }
      });

      // Contract mavjudligini tekshirish
      if (contractId) {
        const contract = await prisma.contract.findUnique({
          where: { id: contractId }
        });
        const currentClientId = task?.clientId || clientId;
        if (!contract || contract.clientId !== currentClientId) {
          return res.status(400).json({ error: 'Shartnoma topilmadi yoki bu mijozga tegishli emas' });
        }
      }

      // Invoice'ni yangilash
      invoice = await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          invoiceNumber: finalInvoiceNumber,
          contractNumber: contractNumber || client?.contractNumber || undefined,
          contractId: contractId || undefined,
          date: date ? new Date(date) : undefined,
          currency: currency || client?.dealAmountCurrency || 'USD',
          totalAmount: totalAmount || (task ? task.snapshotDealAmount : 0) || 0,
          notes: notes || undefined,
          additionalInfo: additionalInfo || undefined,
        },
        include: {
          items: true,
          client: true,
          task: true,
          branch: true,
        }
      });
    } else {
      // Yangi invoice yaratish
      let finalInvoiceNumber: string;
      
      if (invoiceNumber) {
        // Foydalanuvchi invoice raqamini kiritgan — shartnoma bo'yicha unique tekshirish
        const dupWhere = contractId
          ? { contractId, invoiceNumber: invoiceNumber }
          : { contractId: null, invoiceNumber: invoiceNumber };
        const duplicateInvoice = await prisma.invoice.findFirst({
          where: dupWhere,
        });
        if (duplicateInvoice) {
          return res.status(400).json({ error: 'Bu invoice raqami allaqachon mavjud. Ozgartirish kerak' });
        }
        finalInvoiceNumber = invoiceNumber;
      } else {
        // Avtomatik invoice raqami: contractId bor bo'lsa shartnoma bo'yicha, yo'q bo'lsa global
        if (contractId) {
          const lastInvoice = await prisma.invoice.findFirst({
            where: { contractId },
            orderBy: { createdAt: 'desc' },
          });
          finalInvoiceNumber = lastInvoice ? getNextInvoiceNumber(lastInvoice.invoiceNumber) : '1';
        } else {
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { invoiceNumber: 'desc' }
          });
          const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber, 10) : 0;
          finalInvoiceNumber = (isNaN(lastNumber) ? 0 : lastNumber + 1).toString();
        }
      }

      // Contract mavjudligini tekshirish
      if (contractId) {
        const contract = await prisma.contract.findUnique({
          where: { id: contractId }
        });
        const currentClientId = task?.clientId || clientId;
        if (!contract || contract.clientId !== currentClientId) {
          return res.status(400).json({ error: 'Shartnoma topilmadi yoki bu mijozga tegishli emas' });
        }
      }

      const invoiceData: any = {
        invoiceNumber: finalInvoiceNumber,
        contractNumber: contractNumber || client?.contractNumber || undefined,
        contractId: contractId || undefined,
        taskId: task?.id || undefined,
        clientId: task?.clientId || clientId!,
        date: date ? new Date(date) : new Date(),
        currency: currency || client?.dealAmountCurrency || 'USD',
        totalAmount: totalAmount || (task ? task.snapshotDealAmount : 0) || 0,
        notes: notes || undefined,
        additionalInfo: additionalInfo || undefined,
      };
      
      if (branchId) {
        invoiceData.branchId = branchId;
      }

      invoice = await prisma.invoice.create({
        data: invoiceData,
        include: {
          items: true,
          client: true,
          task: true,
          branch: true,
        }
      });
    }

    // Itemlarni qo'shish
    if (items && items.length > 0) {
      await prisma.invoiceItem.createMany({
        data: items.map((item, index) => ({
          invoiceId: invoice.id,
          tnvedCode: item.tnvedCode || undefined,
          pluCode: item.pluCode || undefined,
          name: item.name,
          packageType: item.packageType || undefined,
          unit: item.unit,
          quantity: item.quantity,
          packagesCount: item.packagesCount ?? undefined,
          grossWeight: item.grossWeight || undefined,
          netWeight: item.netWeight || undefined,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          orderIndex: item.orderIndex ?? index,
        }))
      });
    }

    // Yangilangan invoice'ni qaytarish
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        client: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    if (updatedInvoice.taskId && req.user) {
      await ensureCmrForInvoice({
        invoiceId: updatedInvoice.id,
        uploadedById: req.user.id,
      });
      await ensureTirForInvoice({
        invoiceId: updatedInvoice.id,
        uploadedById: req.user.id,
      });
    }

    res.json({
      ...updatedInvoice,
      totalAmount: Number(updatedInvoice.totalAmount),
      items: updatedInvoice.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        packagesCount: item.packagesCount != null ? Number(item.packagesCount) : null,
        grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
        netWeight: item.netWeight ? Number(item.netWeight) : null,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      }))
    });
  } catch (error: any) {
    console.error('Error creating/updating invoice:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices/:id/pdf - Invoice PDF yuklab olish
router.get('/:id/pdf', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log('Generating PDF for invoice ID:', id);
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        client: true,
        branch: true,
      }
    });

    if (!invoice) {
      console.log('Invoice not found:', id);
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    console.log('Invoice found, items count:', invoice.items.length);

    // Contract ma'lumotlarini olish (asosiy manba - mijoz sahifasidan)
    let contract: any = null;
    if (invoice.contractId) {
      try {
        contract = await prisma.contract.findUnique({
          where: { id: invoice.contractId }
        });
        console.log('Contract found:', contract ? `ID ${contract.id}` : 'not found');
      } catch (contractError) {
        console.error('Error fetching contract:', contractError);
      }
    } else {
      console.log('No contractId in invoice');
    }

    // Agar invoice contractId bo'lmasa yoki topilmasa, contractNumber bo'yicha izlash
    if (!contract && invoice.contractNumber) {
      try {
        contract = await prisma.contract.findFirst({
          where: {
            clientId: invoice.clientId,
            contractNumber: invoice.contractNumber
          }
        });
        console.log('Contract found by contractNumber:', contract ? `ID ${contract.id}` : 'not found');
      } catch (contractError) {
        console.error('Error fetching contract by contractNumber:', contractError);
      }
    }

    // Agar hali ham topilmasa, mijozga biriktirilgan so'nggi shartnomani olish
    if (!contract) {
      try {
        contract = await prisma.contract.findFirst({
          where: { clientId: invoice.clientId },
          orderBy: [
            { contractDate: 'desc' },
            { id: 'desc' }
          ]
        });
        console.log('Fallback contract for client:', contract ? `ID ${contract.id}` : 'not found');
      } catch (contractError) {
        console.error('Error fetching fallback contract:', contractError);
      }
    }

    // Company settings'ni olish - avval contract seller ma'lumotlaridan, keyin global settings
    let companySettings: any = null;
    
    // Avval contract seller ma'lumotlaridan foydalanish (asosiy manba)
    if (contract) {
      console.log('Using company settings from contract seller information (mijoz sahifasidan)');
      // Contract seller ma'lumotlaridan company settings yaratish
      companySettings = {
        id: 0, // Temporary ID
        name: contract.sellerName || '',
        legalAddress: contract.sellerLegalAddress || '',
        actualAddress: contract.sellerLegalAddress || '',
        inn: contract.sellerInn || null,
        phone: null, // Contract'da phone yo'q
        email: null, // Contract'da email yo'q
        bankName: contract.sellerBankName || null,
        bankAddress: contract.sellerBankAddress || null,
        bankAccount: contract.sellerBankAccount || null,
        swiftCode: contract.sellerBankSwift || null,
        correspondentBank: contract.sellerCorrespondentBank || null,
        correspondentBankAddress: null, // Contract'da bu maydon yo'q
        correspondentBankSwift: contract.sellerCorrespondentBankSwift || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    } else {
      // Fallback: global CompanySettings'ni tekshirish
      console.log('Contract not found, trying global company settings');
      companySettings = await prisma.companySettings.findFirst();
      
      if (!companySettings) {
        console.log('Company settings not found and contract missing');
        return res.status(400).json({ error: 'Kompaniya sozlamalari topilmadi. Iltimos, avval kompaniya ma\'lumotlarini kiriting yoki shartnoma ma\'lumotlarini to\'ldiring.' });
      } else {
        console.log('Using global company settings as fallback');
      }
    }

    // PDF generatsiya
    try {
      console.log('Starting PDF generation...');
      
      let doc;
      try {
        doc = generateInvoicePDF({
        invoice: {
          ...invoice,
          totalAmount: new Prisma.Decimal(Number(invoice.totalAmount)),
          items: invoice.items.map(item => ({
            ...item,
            quantity: new Prisma.Decimal(Number(item.quantity) || 0),
            grossWeight: item.grossWeight ? new Prisma.Decimal(Number(item.grossWeight)) : null,
            netWeight: item.netWeight ? new Prisma.Decimal(Number(item.netWeight)) : null,
          unitPrice: new Prisma.Decimal(Number(item.unitPrice) || 0),
          totalPrice: new Prisma.Decimal(Number(item.totalPrice) || 0),
          }))
        },
        client: invoice.client,
        company: companySettings,
          contract: contract,
      });
      } catch (genError: any) {
        console.error('Error in generateInvoicePDF call:', genError);
        throw genError; // Re-throw to be caught by outer catch
      }

      console.log('PDF document created, setting headers...');
      
      try {
        res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      
      // Error handling for PDF stream
      doc.on('error', (err) => {
        console.error('PDF stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'PDF generatsiya xatoligi: ' + err.message });
        }
      });

      res.on('error', (err) => {
        console.error('Response stream error:', err);
      });

      console.log('Piping PDF to response...');
      doc.pipe(res);
      doc.end();
      console.log('PDF generation completed');
      } catch (pipeError: any) {
        console.error('Error in pipe/setHeader:', pipeError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'PDF generatsiya xatoligi: ' + (pipeError.message || 'Noma\'lum xatolik') });
        }
        throw pipeError;
      }
    } catch (pdfError: any) {
      console.error('Error in PDF generation:', pdfError);
      console.error('Error stack:', pdfError.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generatsiya xatoligi: ' + (pdfError.message || 'Noma\'lum xatolik') });
      } else {
        console.error('Headers already sent, cannot send error response');
      }
    }
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
    }
  }
});

// GET /invoices/:id/xlsx - Invoice Excel yuklab olish
router.get('/:id/xlsx', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' }
        },
        client: true,
      }
    });

    if (!invoice || !invoice.client) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    let contract: any = null;
    if (invoice.contractId) {
      contract = await prisma.contract.findUnique({
        where: { id: invoice.contractId }
      });
    }

    if (!contract && invoice.contractNumber) {
      contract = await prisma.contract.findFirst({
        where: {
          clientId: invoice.clientId,
          contractNumber: invoice.contractNumber
        }
      });
    }

    if (!contract) {
      contract = await prisma.contract.findFirst({
        where: { clientId: invoice.clientId },
        orderBy: [
          { contractDate: 'desc' },
          { id: 'desc' }
        ]
      });
    }

    let companySettings: any = null;
    if (!contract) {
      companySettings = await prisma.companySettings.findFirst();
      if (!companySettings) {
        return res.status(400).json({ error: 'Kompaniya sozlamalari topilmadi. Iltimos, avval kompaniya ma\'lumotlarini kiriting yoki shartnoma ma\'lumotlarini to\'ldiring.' });
      }
    }

    const workbook = await generateInvoiceExcel({
      invoice,
      client: invoice.client,
      contract,
      company: companySettings,
    });

    const buffer = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
    const outputBuffer = Buffer.from(buffer as ArrayBuffer);
    const fileName = `Invoice_${invoice.invoiceNumber || invoice.id}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    res.setHeader('Content-Length', outputBuffer.length);
    res.end(outputBuffer);
  } catch (error: any) {
    console.error('Error generating Invoice Excel:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// DELETE /invoices/:id - Invoice va unga tegishli task o'chirish
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const taskId = invoice.taskId;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.delete({ where: { id } });
      await tx.taskStage.deleteMany({ where: { taskId } });
      await tx.taskError.deleteMany({ where: { taskId } });
      await tx.kpiLog.deleteMany({ where: { taskId } });
      await tx.task.delete({ where: { id: taskId } });
    });

    res.json({ message: 'Invoice va task muvaffaqiyatli o\'chirildi' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices/:id/cmr - CMR Excel yuklab olish
router.get('/:id/cmr', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { fileName, outputPath } = await ensureCmrForInvoice({
      invoiceId: id,
      uploadedById: req.user.id,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    const buffer = await fs.readFile(outputPath);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: any) {
    console.error('Error generating CMR Excel:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /invoices/:id/tir - TIR Excel yuklab olish
router.get('/:id/tir', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { fileName, outputPath } = await ensureTirForInvoice({
      invoiceId: id,
      uploadedById: req.user.id,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    res.setHeader('Cache-Control', 'no-store');
    const buffer = await fs.readFile(outputPath);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: any) {
    console.error('Error generating TIR Excel:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

