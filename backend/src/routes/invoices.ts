import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { generateInvoicePDF } from '../services/invoice-pdf';
import { Prisma } from '@prisma/client';

const router = Router();

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
    tnvedCode: z.string().optional(),
    pluCode: z.string().optional(),
    name: z.string(),
    packageType: z.string().optional(),
    unit: z.string(),
    quantity: z.number(),
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

// GET /invoices/task/:taskId - Task uchun invoice
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
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    res.json({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      items: invoice.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
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
    const id = parseInt(req.params.id);
    
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
      return res.status(400).json({ error: parsed.error.flatten() });
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
      
      // Invoice raqami o'zgargan bo'lsa, unique tekshirish
      if (invoiceNumber && invoiceNumber !== existingInvoice.invoiceNumber) {
        const duplicateInvoice = await prisma.invoice.findUnique({
          where: { invoiceNumber: invoiceNumber }
        });
        if (duplicateInvoice && duplicateInvoice.id !== existingInvoice.id) {
          return res.status(400).json({ error: 'Bu invoice raqami allaqachon mavjud' });
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
        // Foydalanuvchi invoice raqamini kiritgan
        const duplicateInvoice = await prisma.invoice.findUnique({
          where: { invoiceNumber: invoiceNumber }
        });
        if (duplicateInvoice) {
          return res.status(400).json({ error: 'Bu invoice raqami allaqachon mavjud' });
        }
        finalInvoiceNumber = invoiceNumber;
      } else {
        // Avtomatik invoice raqami generatsiya
        const lastInvoice = await prisma.invoice.findFirst({
          orderBy: { invoiceNumber: 'desc' }
        });
        
        const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber) : 0;
        finalInvoiceNumber = (lastNumber + 1).toString();
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

      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: finalInvoiceNumber,
          contractNumber: contractNumber || client?.contractNumber || undefined,
          contractId: contractId || undefined,
          taskId: task?.id || undefined,
          clientId: task?.clientId || clientId!,
          ...(branchId ? { branchId } : {}),
          date: date ? new Date(date) : new Date(),
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

    res.json({
      ...updatedInvoice,
      totalAmount: Number(updatedInvoice!.totalAmount),
      items: updatedInvoice!.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
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

    // Company settings'ni olish
    const companySettings = await prisma.companySettings.findFirst();
    if (!companySettings) {
      console.log('Company settings not found');
      return res.status(400).json({ error: 'Kompaniya sozlamalari topilmadi. Iltimos, avval kompaniya ma\'lumotlarini kiriting.' });
    }

    console.log('Company settings found');

    // Contract ma'lumotlarini olish
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

// DELETE /invoices/:id - Invoice o'chirish
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    await prisma.invoice.delete({
      where: { id }
    });

    res.json({ message: 'Invoice muvaffaqiyatli o\'chirildi' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

