import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { generateInvoicePDF } from '../services/invoice-pdf';
import { translateRequisites, isCachedTranslationUsable } from '../services/translate.service';
import { generateInvoiceExcel } from '../services/invoice-excel';
import { generateFssExcel } from '../services/fss-excel';
import { Prisma } from '@prisma/client';
import { getNextInvoiceNumber } from '../utils/invoice-number';
import { attachmentDisposition } from '../utils/content-disposition';
import { ensureCmrForInvoice } from '../services/cmr-service';
import { ensureTirForInvoice } from '../services/tir-service';
import { generateST1GoodsExcel } from '../services/st1-goods-excel';
import { generateCommodityEkExcel } from '../services/commodity-ek-excel';
import { generateCmrDocx } from '../services/cmr-doc';
import { generateOriginInfoDocx } from '../services/origin-info-doc';
import { generateOriginInfoPdf } from '../services/origin-info-pdf';
import fs from 'fs/promises';
import { socketEmitter } from '../services/socketEmitter';
import {
  invoiceSchema,
  saveInvoice,
  InvoiceSaveError,
  ensureInvoiceDerivedDocs,
  broadcastInvoiceSaved,
  serializeSavedInvoice,
} from '../services/invoice-save.service';

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
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
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
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices - Barcha invoice'lar (paginatsiya, filtrlash va qidiruv bilan)
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const isAdminOrManager = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    const userBranchId = req.user?.branchId ?? null;
    const onlyOwnBranch = !isAdminOrManager && userBranchId != null;

    const { page, limit, search, branchId, clientId, startDate, endDate } = req.query;
    
    // Pagination params
    const pageNum = page ? parseInt(page as string, 10) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum || undefined;

    // Build where clause
    const where: any = {};
    if (onlyOwnBranch) {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = parseInt(branchId as string, 10);
    }

    if (clientId) {
      where.clientId = parseInt(clientId as string, 10);
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    
    if (search) {
      const q = (search as string).trim();
      // additionalInfo JSONB ichidan qidiruv uchun raw SQL (ILIKE - case-insensitive)
      const jsonMatchIds = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM "Invoice"
        WHERE "additionalInfo"::text ILIKE ${'%' + q + '%'}
      `;
      const matchedIds = jsonMatchIds.map((r) => r.id);

      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { contractNumber: { contains: q, mode: 'insensitive' } },
        { contract: { contractNumber: { contains: q, mode: 'insensitive' } } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
        { task: { title: { contains: q, mode: 'insensitive' } } },
        ...(matchedIds.length > 0 ? [{ id: { in: matchedIds } }] : []),
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        include: {
          items: {
            orderBy: { orderIndex: 'asc' }
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              branch: { select: { id: true, name: true } },
              stages: { select: { name: true, status: true } },
              _count: { select: { errors: true } }
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
              shipperName: true,
              buyerName: true,
              consigneeName: true,
              contractCurrency: true,
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
      }),
      pageNum && limitNum ? prisma.invoice.count({ where }) : Promise.resolve(0)
    ]);

    const invoicesWithContract = await Promise.all(invoices.map(async (invoice) => {
      let contract = invoice.contract;
      if (!contract && invoice.contractNumber && invoice.clientId) {
        const found = await prisma.contract.findFirst({
          where: {
            contractNumber: invoice.contractNumber,
            clientId: invoice.clientId,
          },
          select: { sellerName: true, shipperName: true, buyerName: true, consigneeName: true, contractCurrency: true },
        });
        if (found) contract = found;
      }
      return {
        ...invoice,
        contract,
        totalAmount: Number(invoice.totalAmount),
        items: invoice.items.map((item: any) => ({
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
    
    if (pageNum && limitNum) {
      res.json({
        invoices: invoicesWithContract,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      });
    } else {
      res.json(invoicesWithContract);
    }
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/client/:clientId - Mijozning barcha invoice'lari
router.get('/client/:clientId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ error: 'Noto\'g\'ri clientId' });
    }

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
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/task/:taskId - Task uchun invoice (yo'q bo'lsa 200 + null)
router.get('/task/:taskId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (!Number.isFinite(taskId)) {
      return res.status(400).json({ error: 'Noto\'g\'ri taskId' });
    }

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
            _count: { select: { errors: true } },
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
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/:id/st1-goods — goods.xlsx (ST-1 dasturi uchun tovarlar ro'yxati) shabloniga yozib yuklab olish
router.get('/:id/st1-goods', requireAuth(), async (req: AuthRequest, res: Response) => {
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
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const workbook = await generateST1GoodsExcel({
      invoice,
      items: invoice.items,
    });

    const buffer = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
    const outputBuffer = Buffer.from(buffer as ArrayBuffer);
    const fileName = `ST1_tovarlar_${invoice.invoiceNumber || invoice.id}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Content-Length', outputBuffer.length);
    res.end(outputBuffer);
  } catch (error: any) {
    console.error('Error generating ST1 goods Excel:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/:id/commodity-ek — CommodityEk_New2.xlsx (Deklaratsiya) shabloniga ma'lumotlarni yozib Excel yuklab olish
router.get('/:id/commodity-ek', requireAuth(), async (req: AuthRequest, res: Response) => {
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
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    let contract: { specification: unknown; sellerInn?: string | null } | null = null;
    if (invoice.contractId) {
      const c = await prisma.contract.findUnique({
        where: { id: invoice.contractId },
        select: { specification: true, sellerInn: true },
      });
      if (c) contract = { specification: c.specification, sellerInn: c.sellerInn };
    }
    // H4 (Продавец INN): shartnomada INN bo'lmasa mijoz INN dan foydalanamiz
    const hasSellerInn = contract?.sellerInn != null && String(contract.sellerInn).trim() !== '';
    if (!hasSellerInn && invoice.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: invoice.clientId },
        select: { inn: true },
      });
      const clientInn = client?.inn ? String(client.inn).trim() : null;
      if (clientInn) {
        if (!contract) contract = { specification: null, sellerInn: clientInn };
        else contract = { ...contract, sellerInn: clientInn };
      }
    }

    const branch = await prisma.branch.findUnique({
      where: { id: invoice.branchId },
      select: { name: true },
    });
    const workbook = await generateCommodityEkExcel({
      invoice,
      items: invoice.items,
      contract,
      forcedRegionInternalCode: null,
      branchName: branch?.name ?? null,
    });

    const buffer = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
    const outputBuffer = Buffer.from(buffer as ArrayBuffer);
    const fileName = `Deklaratsiya_${invoice.invoiceNumber || invoice.id}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Content-Length', outputBuffer.length);
    res.end(outputBuffer);
  } catch (error: any) {
    console.error('Error generating CommodityEk Excel:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/:id/cmr-doc - CMR shabloniga (DOCX) ma'lumotlarni yozib yuklab olish
router.get('/:id/cmr-doc', requireAuth(), async (req: AuthRequest, res: Response) => {
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
        branch: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    let contract: any = null;
    if (invoice.contractId) {
      contract = await prisma.contract.findUnique({
        where: { id: invoice.contractId }
      });
    } else if (invoice.contractNumber) {
      contract = await prisma.contract.findFirst({
        where: { clientId: invoice.clientId, contractNumber: invoice.contractNumber }
      });
    }

    const companySettings = await prisma.companySettings.findFirst();

    const buffer = await generateCmrDocx({
      invoice,
      items: invoice.items,
      contract,
      client: invoice.client,
      companySettings,
    });

    const fileName = `CMR_${invoice.invoiceNumber || invoice.id}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: any) {
    console.error('Error generating CMR Docx:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/:id/origin-info-doc?format=docx|pdf - "Информация о происхождении товара"
const originInfoQuerySchema = z.object({ format: z.enum(['docx', 'pdf']).default('docx') });

router.get('/:id/origin-info-doc', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const query = originInfoQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: "Noto'g'ri format" });
    }
    const { format } = query.data;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const contract = invoice.contractId
      ? await prisma.contract.findUnique({ where: { id: invoice.contractId } })
      : invoice.contractNumber
        ? await prisma.contract.findFirst({
            where: { clientId: invoice.clientId, contractNumber: invoice.contractNumber },
          })
        : null;
    const companySettings = await prisma.companySettings.findFirst();

    const payload = { invoice, items: invoice.items, contract, companySettings };
    const buffer =
      format === 'pdf' ? await generateOriginInfoPdf(payload) : await generateOriginInfoDocx(payload);

    const fileName = `Proisxozhdenie_${invoice.invoiceNumber || invoice.id}.${format}`;
    res.setHeader(
      'Content-Type',
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: unknown) {
    console.error('Error generating origin info document:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/:id/pdf - Invoice PDF yuklab olish
router.get('/:id/pdf', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }
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
      res.setHeader('Content-Disposition', attachmentDisposition(`invoice-${invoice.invoiceNumber}.pdf`));
      
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
      res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
  }
});

// POST /invoices/:id/translations-en - inglizcha PDF uchun matnlarni tarjima qilish
//
// Inglizcha PDF frontendda, RUSCHA PDF bilan AYNAN bir xil komponentlardan
// chiziladi (qarang: `frontend/.../pdf/pdfI18n.ts`) — bu yerda faqat matn
// tarjima qilinadi. Matnlarni frontend yuboradi, chunki chiziladigan qiymat
// bazadagi emas, FORMA dagi (saqlanmagan o'zgarish ham to'g'ri tarjima bo'lsin).
//
// Tarjima invoysga keshlanadi: bir marta tarjima qilingan matn qayta
// so'ralmaydi (AI chaqiruvi qimmat va sekin).
const translationsEnSchema = z.object({
  texts: z.record(z.string().min(1).max(200), z.string().max(3000)).refine(
    (v) => Object.keys(v).length <= 400,
    { message: 'Tarjima uchun matnlar juda ko\'p (400 tadan ko\'p)' }
  ),
});

router.post('/:id/translations-en', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const parsed = translationsEnSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Noto\'g\'ri so\'rov' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, additionalInfo: true },
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const additionalInfo = (invoice.additionalInfo && typeof invoice.additionalInfo === 'object')
      ? (invoice.additionalInfo as Record<string, any>) : {};
    const cachedAll = (additionalInfo.translatedRequisitesEn && typeof additionalInfo.translatedRequisitesEn === 'object')
      ? (additionalInfo.translatedRequisitesEn as Record<string, unknown>) : {};

    // Kesh MANBA matni bilan birga saqlanadi: foydalanuvchi ruscha matnni
    // o'zgartirsa (masalan tovar nomini), eski tarjima ishlatilib qolmasligi
    // kerak. Eski format (faqat tarjima matni) ham qo'llab-quvvatlanadi —
    // unda manba noma'lum, shuning uchun tarjima qayta so'raladi.
    const cache = new Map<string, { source: string; translated: string }>();
    for (const [key, value] of Object.entries(cachedAll)) {
      if (value && typeof value === 'object' && typeof (value as any).translated === 'string') {
        cache.set(key, {
          source: String((value as any).source ?? ''),
          translated: String((value as any).translated),
        });
      }
    }

    const requested = parsed.data.texts;
    const translations: Record<string, string> = {};
    const missing: Record<string, string> = {};

    for (const [key, source] of Object.entries(requested)) {
      const hit = cache.get(key);
      if (hit && isCachedTranslationUsable(source, hit)) translations[key] = hit.translated;
      else if (source.trim()) missing[key] = source;
    }

    if (Object.keys(missing).length > 0) {
      const aiTranslated = await translateRequisites(missing);
      for (const [key, source] of Object.entries(missing)) {
        const translated = aiTranslated[key];
        if (typeof translated === 'string' && translated.trim()) {
          translations[key] = translated;
          cache.set(key, { source, translated });
        }
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          additionalInfo: {
            ...additionalInfo,
            translatedRequisitesEn: Object.fromEntries(cache),
          } as Prisma.InputJsonValue,
        },
      });
    }

    res.json({ translations });
  } catch (error: any) {
    console.error('Error translating invoice texts:', error);
    // Tarjimasiz ham hujjat yaratilishi kerak — frontend ruscha matnga qaytadi
    res.status(502).json({ error: 'Tarjima xizmati javob bermadi' });
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
        items: { orderBy: { orderIndex: 'asc' } },
        client: true,
      }
    });

    if (!invoice || !invoice.client) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    let contract: any = null;
    if (invoice.contractId) {
      contract = await prisma.contract.findUnique({ where: { id: invoice.contractId } });
    }

    if (!contract && invoice.contractNumber) {
      contract = await prisma.contract.findFirst({
        where: { clientId: invoice.clientId, contractNumber: invoice.contractNumber }
      });
    }

    if (!contract) {
      contract = await prisma.contract.findFirst({
        where: { clientId: invoice.clientId },
        orderBy: [{ contractDate: 'desc' }, { id: 'desc' }]
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
      invoice, client: invoice.client, contract, company: companySettings,
    });

    const buffer = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
    const outputBuffer = Buffer.from(buffer as ArrayBuffer);
    const fileName = `Invoice_${invoice.invoiceNumber || invoice.id}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Content-Length', outputBuffer.length);
    res.end(outputBuffer);
  } catch (error: any) {
    console.error('Error generating Invoice Excel:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /invoices/:id/fss - Ichki FSS Excel yuklab olish
router.get('/:id/fss', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const regionInternalCode = typeof req.query.regionInternalCode === 'string' ? req.query.regionInternalCode : undefined;
    const regionName = typeof req.query.regionName === 'string' ? req.query.regionName : undefined;
    const regionExternalCode = typeof req.query.regionExternalCode === 'string' ? req.query.regionExternalCode : undefined;
    const templateType = req.query.template === 'ichki' ? 'ichki' : 'tashqi';

    let contractForFss: { specification: unknown } | null = null;
    if (invoice.contractId) {
      const c = await prisma.contract.findUnique({ where: { id: invoice.contractId }, select: { specification: true } });
      if (c) contractForFss = { specification: c.specification };
    }
    if (!contractForFss && invoice.contractNumber && invoice.clientId) {
      const c = await prisma.contract.findFirst({ where: { clientId: invoice.clientId, contractNumber: invoice.contractNumber }, select: { specification: true } });
      if (c) contractForFss = { specification: c.specification };
    }
    if (!contractForFss && invoice.clientId) {
      const c = await prisma.contract.findFirst({ where: { clientId: invoice.clientId }, orderBy: [{ contractDate: 'desc' }, { id: 'desc' }], select: { specification: true } });
      if (c) contractForFss = { specification: c.specification };
    }

    let packagingTypeCodesFromSettings: Array<{ name: string; code: string }> = [];
    try {
      const packagingTypes = await prisma.packagingType.findMany({ orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] });
      packagingTypeCodesFromSettings = packagingTypes.map((p) => ({ name: p.name, code: p.code || '' }));
    } catch (e) {
      console.error('[invoices/fss] packagingType findMany failed:', (e as Error)?.message);
    }

    const workbook = await generateFssExcel({
      invoice, items: invoice.items, regionInternalCode, regionName, regionExternalCode,
      templateType, contract: contractForFss, packagingTypeCodesFromSettings,
    });

    const buffer = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
    const outputBuffer = Buffer.from(buffer as ArrayBuffer);
    const fileName = `FSS_${invoice.invoiceNumber || invoice.id}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Content-Length', outputBuffer.length);
    res.end(outputBuffer);
  } catch (error: any) {
    console.error('Error generating FSS Excel:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// DELETE /invoices/:id - Invoice va unga tegishli task o'chirish
router.delete('/:id', requireAuth('ADMIN', 'MANAGER', 'DEKLARANT'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri id' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { task: { select: { status: true, stages: { select: { name: true, status: true } } } } }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice topilmadi' });
    }

    const invoysStageReady = invoice.task?.stages?.some(
      (s: { name: string; status: string }) => String(s.name).trim().toLowerCase() === 'invoys' && s.status === 'TAYYOR'
    );
    const taskNotBoshlanmagan = invoice.task?.status !== 'BOSHLANMAGAN';
    if (invoysStageReady || taskNotBoshlanmagan) {
      return res.status(400).json({ error: 'O\'chirish faqat task BOSHLANMAGAN va Invoys tayyor bo\'lmaganda mumkin' });
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
    if (req.user) {
      socketEmitter.broadcastExcept(req.user.id, 'invoice:deleted', { invoiceId: id, taskId, deletedBy: req.user.name });
    }
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    const buffer = await fs.readFile(outputPath);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: any) {
    console.error('Error generating CMR Excel:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachmentDisposition(fileName));
    res.setHeader('Cache-Control', 'no-store');
    const buffer = await fs.readFile(outputPath);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: any) {
    console.error('Error generating TIR Excel:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

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
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// POST /invoices - Yangi invoice yaratish yoki mavjudni yangilash (mantiq: services/invoice-save.service.ts)
router.post('/', requireAuth('ADMIN', 'MANAGER', 'DEKLARANT'), async (req: AuthRequest, res) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      // Maydon yo'lisiz xabar ("Expected number, received string") prodda foydasiz —
      // qaysi maydon yiqilganini ko'rsatamiz va to'liq ro'yxatni logga yozamiz.
      const issues = parsed.error.issues;
      console.warn(
        '[invoice] validation failed:',
        issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join(' | ')
      );
      const first = issues[0];
      const path = first?.path.join('.');
      const errMsg = first
        ? (path ? `${path}: ${first.message}` : first.message)
        : 'Ma\'lumotlarda xatolik';
      return res.status(400).json({ error: errMsg, issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    }

    const { invoice, isNew, warnings } = await saveInvoice(parsed.data);
    if (req.user) {
      await ensureInvoiceDerivedDocs(invoice, req.user.id);
    }
    res.json(serializeSavedInvoice(invoice, warnings));
    if (req.user) {
      broadcastInvoiceSaved(invoice, isNew, req.user);
    }
  } catch (error) {
    if (error instanceof InvoiceSaveError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating/updating invoice:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});







export default router;

