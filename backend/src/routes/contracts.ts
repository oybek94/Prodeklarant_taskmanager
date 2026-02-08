import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const deliveryTermsSchema = z.object({
  deliveryTerms: z.string().optional(),
});

// Contract yaratish/update uchun schema
const contractSchema = z.object({
  clientId: z.number(),
  contractNumber: z.string().min(1),
  contractDate: z.string(),
  sellerName: z.string().min(1),
  sellerLegalAddress: z.string().min(1),
  sellerDetails: z.string().optional(), // To'g'ridan-to'g'ri textarea ma'lumotlari
  sellerInn: z.string().optional(),
  sellerOgrn: z.string().optional(),
  sellerBankName: z.string().optional(),
  sellerBankAddress: z.string().optional(),
  sellerBankAccount: z.string().optional(),
  sellerBankSwift: z.string().optional(),
  sellerCorrespondentBank: z.string().optional(),
  sellerCorrespondentBankAccount: z.string().optional(),
  sellerCorrespondentBankSwift: z.string().optional(),
  buyerName: z.string().min(1),
  buyerAddress: z.string().min(1),
  destinationCountry: z.string().min(1),
  buyerDetails: z.string().optional(), // To'g'ridan-to'g'ri textarea ma'lumotlari
  buyerInn: z.string().optional(),
  buyerOgrn: z.string().optional(),
  buyerBankName: z.string().optional(),
  buyerBankAddress: z.string().optional(),
  buyerBankAccount: z.string().optional(),
  buyerBankSwift: z.string().optional(),
  buyerCorrespondentBank: z.string().optional(),
  buyerCorrespondentBankAccount: z.string().optional(),
  buyerCorrespondentBankSwift: z.string().optional(),
  shipperName: z.string().optional(),
  shipperAddress: z.string().optional(),
  shipperDetails: z.string().optional(), // To'g'ridan-to'g'ri textarea ma'lumotlari
  shipperInn: z.string().optional(),
  shipperOgrn: z.string().optional(),
  shipperBankName: z.string().optional(),
  shipperBankAddress: z.string().optional(),
  shipperBankAccount: z.string().optional(),
  shipperBankSwift: z.string().optional(),
  consigneeName: z.string().optional(),
  consigneeAddress: z.string().optional(),
  consigneeDetails: z.string().optional(), // To'g'ridan-to'g'ri textarea ma'lumotlari
  consigneeInn: z.string().optional(),
  consigneeOgrn: z.string().optional(),
  consigneeBankName: z.string().optional(),
  consigneeBankAddress: z.string().optional(),
  consigneeBankAccount: z.string().optional(),
  consigneeBankSwift: z.string().optional(),
  deliveryTerms: z.string().optional(),
  customsAddress: z.string().optional(),
  paymentMethod: z.string().optional(),
  contractCurrency: z.string().optional(), // Shartnoma valyutasi (USD, RUB va boshqalar)
  gln: z.string().optional(), // Глобальный идентификационный номер GS1 (GLN)
  supplierDirector: z.string().optional(), // Руководитель Поставщика
  buyerDirector: z.string().optional(),
  consigneeDirector: z.string().optional(),
  goodsReleasedBy: z.string().optional(), // Товар отпустил
  signatureUrl: z.string().optional(),
  sealUrl: z.string().optional(),
  sellerSignatureUrl: z.string().optional(),
  sellerSealUrl: z.string().optional(),
  buyerSignatureUrl: z.string().optional(),
  buyerSealUrl: z.string().optional(),
  consigneeSignatureUrl: z.string().optional(),
  consigneeSealUrl: z.string().optional(),
  specification: z.array(z.object({
    productName: z.string(),
    tnvedCode: z.string().optional(),
    quantity: z.number(),
    unit: z.string().optional(),
    unitPrice: z.number().optional(),
    totalPrice: z.number().optional(),
    specNumber: z.string().optional(),
    productNumber: z.string().optional(),
  })).optional(),
});

// GET /contracts/client/:clientId - Mijozning barcha shartnomalari
router.get('/client/:clientId', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const contracts = await prisma.contract.findMany({
      where: { clientId },
      orderBy: { contractDate: 'desc' }
    });

    if (contracts.length > 0) {
      const directors = await prisma.$queryRaw<Array<{ id: number; buyerDirector: string | null; consigneeDirector: string | null }>>`
        SELECT "id", "buyerDirector", "consigneeDirector" FROM "Contract" WHERE "clientId" = ${clientId}
      `;
      const byId = Object.fromEntries((directors || []).map((d: any) => [d.id, { buyerDirector: d.buyerDirector ?? null, consigneeDirector: d.consigneeDirector ?? null }]));
      const merged = contracts.map((c: any) => ({ ...c, ...byId[c.id] }));
      return res.json(merged);
    }
    res.json(contracts);
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /contracts/:id - Bitta shartnoma ma'lumotlari
router.get('/:id', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Shartnoma topilmadi' });
    }

    const directors = await prisma.$queryRaw<Array<{ buyerDirector: string | null; consigneeDirector: string | null }>>`
      SELECT "buyerDirector", "consigneeDirector" FROM "Contract" WHERE "id" = ${id}
    `;
    const result = directors?.[0]
      ? { ...contract, buyerDirector: (directors[0] as any).buyerDirector, consigneeDirector: (directors[0] as any).consigneeDirector }
      : contract;
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /contracts - Yangi shartnoma yaratish
router.post('/', requireAuth('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = contractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Client mavjudligini tekshirish
    const client = await prisma.client.findUnique({
      where: { id: data.clientId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Mijoz topilmadi' });
    }

    // Shartnoma raqami unique bo'lishi kerak (bir xil mijozda)
    const existingContract = await prisma.contract.findFirst({
      where: {
        clientId: data.clientId,
        contractNumber: data.contractNumber
      }
    });

    if (existingContract) {
      return res.status(400).json({ error: 'Bu shartnoma raqami allaqachon mavjud' });
    }

    // Build contract data object conditionally to avoid TypeScript errors
    // TODO: Regenerate Prisma client after schema changes
    const contractData: any = {
      clientId: data.clientId,
      contractNumber: data.contractNumber,
      contractDate: new Date(data.contractDate),
      sellerName: data.sellerName,
      sellerLegalAddress: data.sellerLegalAddress,
      buyerName: data.buyerName,
      buyerAddress: data.buyerAddress,
      destinationCountry: data.destinationCountry,
    };

    // Add optional seller fields
    if (data.sellerDetails !== undefined) contractData.sellerDetails = data.sellerDetails;
    if (data.sellerInn !== undefined) contractData.sellerInn = data.sellerInn;
    if (data.sellerOgrn !== undefined) contractData.sellerOgrn = data.sellerOgrn;
    if (data.sellerBankName !== undefined) contractData.sellerBankName = data.sellerBankName;
    if (data.sellerBankAddress !== undefined) contractData.sellerBankAddress = data.sellerBankAddress;
    if (data.sellerBankAccount !== undefined) contractData.sellerBankAccount = data.sellerBankAccount;
    if (data.sellerBankSwift !== undefined) contractData.sellerBankSwift = data.sellerBankSwift;
    if (data.sellerCorrespondentBank !== undefined) contractData.sellerCorrespondentBank = data.sellerCorrespondentBank;
    if (data.sellerCorrespondentBankAccount !== undefined) contractData.sellerCorrespondentBankAccount = data.sellerCorrespondentBankAccount;
    if (data.sellerCorrespondentBankSwift !== undefined) contractData.sellerCorrespondentBankSwift = data.sellerCorrespondentBankSwift;

    // Add optional buyer fields
    if (data.buyerDetails !== undefined) contractData.buyerDetails = data.buyerDetails;
    if (data.buyerInn !== undefined) contractData.buyerInn = data.buyerInn;
    if (data.buyerOgrn !== undefined) contractData.buyerOgrn = data.buyerOgrn;
    if (data.buyerBankName !== undefined) contractData.buyerBankName = data.buyerBankName;
    if (data.buyerBankAddress !== undefined) contractData.buyerBankAddress = data.buyerBankAddress;
    if (data.buyerBankAccount !== undefined) contractData.buyerBankAccount = data.buyerBankAccount;
    if (data.buyerBankSwift !== undefined) contractData.buyerBankSwift = data.buyerBankSwift;
    if (data.buyerCorrespondentBank !== undefined) contractData.buyerCorrespondentBank = data.buyerCorrespondentBank;
    if (data.buyerCorrespondentBankAccount !== undefined) contractData.buyerCorrespondentBankAccount = data.buyerCorrespondentBankAccount;
    if (data.buyerCorrespondentBankSwift !== undefined) contractData.buyerCorrespondentBankSwift = data.buyerCorrespondentBankSwift;

    // Add optional shipper fields
    if (data.shipperName !== undefined) contractData.shipperName = data.shipperName;
    if (data.shipperAddress !== undefined) contractData.shipperAddress = data.shipperAddress;
    if (data.shipperDetails !== undefined) contractData.shipperDetails = data.shipperDetails;
    if (data.shipperInn !== undefined) contractData.shipperInn = data.shipperInn;
    if (data.shipperOgrn !== undefined) contractData.shipperOgrn = data.shipperOgrn;
    if (data.shipperBankName !== undefined) contractData.shipperBankName = data.shipperBankName;
    if (data.shipperBankAddress !== undefined) contractData.shipperBankAddress = data.shipperBankAddress;
    if (data.shipperBankAccount !== undefined) contractData.shipperBankAccount = data.shipperBankAccount;
    if (data.shipperBankSwift !== undefined) contractData.shipperBankSwift = data.shipperBankSwift;

    // Add optional consignee fields
    if (data.consigneeName !== undefined) contractData.consigneeName = data.consigneeName;
    if (data.consigneeAddress !== undefined) contractData.consigneeAddress = data.consigneeAddress;
    if (data.consigneeDetails !== undefined) contractData.consigneeDetails = data.consigneeDetails;
    if (data.consigneeInn !== undefined) contractData.consigneeInn = data.consigneeInn;
    if (data.consigneeOgrn !== undefined) contractData.consigneeOgrn = data.consigneeOgrn;
    if (data.consigneeBankName !== undefined) contractData.consigneeBankName = data.consigneeBankName;
    if (data.consigneeBankAddress !== undefined) contractData.consigneeBankAddress = data.consigneeBankAddress;
    if (data.consigneeBankAccount !== undefined) contractData.consigneeBankAccount = data.consigneeBankAccount;
    if (data.consigneeBankSwift !== undefined) contractData.consigneeBankSwift = data.consigneeBankSwift;

    // Add optional additional fields
    if (data.deliveryTerms !== undefined) contractData.deliveryTerms = data.deliveryTerms;
    if (data.customsAddress !== undefined) contractData.customsAddress = data.customsAddress;
    if (data.paymentMethod !== undefined) contractData.paymentMethod = data.paymentMethod;
    // Shartnoma valyutasi — yaratishda har doim saqlash
    contractData.contractCurrency = (data.contractCurrency && String(data.contractCurrency).trim()) ? String(data.contractCurrency).trim() : 'USD';
    if (data.gln !== undefined) contractData.gln = data.gln;
    if (data.supplierDirector !== undefined) contractData.supplierDirector = data.supplierDirector;
    if (data.goodsReleasedBy !== undefined) contractData.goodsReleasedBy = data.goodsReleasedBy;
    if (data.signatureUrl !== undefined) contractData.signatureUrl = data.signatureUrl;
    if (data.sealUrl !== undefined) contractData.sealUrl = data.sealUrl;
    if (data.sellerSignatureUrl !== undefined) contractData.sellerSignatureUrl = data.sellerSignatureUrl;
    if (data.sellerSealUrl !== undefined) contractData.sellerSealUrl = data.sellerSealUrl;
    if (data.buyerSignatureUrl !== undefined) contractData.buyerSignatureUrl = data.buyerSignatureUrl;
    if (data.buyerSealUrl !== undefined) contractData.buyerSealUrl = data.buyerSealUrl;
    if (data.consigneeSignatureUrl !== undefined) contractData.consigneeSignatureUrl = data.consigneeSignatureUrl;
    if (data.consigneeSealUrl !== undefined) contractData.consigneeSealUrl = data.consigneeSealUrl;
    if (data.specification !== undefined) {
      const spec = Array.isArray(data.specification) ? data.specification : [];
      const toNum = (v: any): number | undefined => {
        if (v == null) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      contractData.specification = spec.map((row: any) => ({
        productName: String(row?.productName ?? ''),
        tnvedCode: row?.tnvedCode != null ? String(row.tnvedCode) : undefined,
        quantity: Number.isFinite(Number(row?.quantity)) ? Number(row.quantity) : 0,
        unit: row?.unit != null ? String(row.unit) : undefined,
        unitPrice: toNum(row?.unitPrice),
        totalPrice: toNum(row?.totalPrice),
        specNumber: row?.specNumber != null ? String(row.specNumber) : undefined,
        productNumber: row?.productNumber != null ? String(row.productNumber) : undefined,
      }));
    }
    const postBuyerDirector = data.buyerDirector;
    const postConsigneeDirector = data.consigneeDirector;

    const contract = await prisma.contract.create({
      data: contractData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
    let createdContract: any = contract;
    if (postBuyerDirector !== undefined || postConsigneeDirector !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contract"
        SET "buyerDirector" = ${postBuyerDirector ?? null},
            "consigneeDirector" = ${postConsigneeDirector ?? null}
        WHERE "id" = ${contract.id}
      `;
      createdContract = { ...contract, buyerDirector: postBuyerDirector ?? null, consigneeDirector: postConsigneeDirector ?? null };
    }
    if (contractData.specification !== undefined) {
      const specJson = JSON.stringify(contractData.specification);
      await prisma.$executeRaw`UPDATE "Contract" SET "specification" = ${specJson}::jsonb WHERE "id" = ${contract.id}`;
      const refreshed = await prisma.contract.findUnique({
        where: { id: contract.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });
      if (refreshed) {
        createdContract = refreshed;
        if (postBuyerDirector !== undefined || postConsigneeDirector !== undefined) {
          createdContract = { ...createdContract, buyerDirector: postBuyerDirector ?? null, consigneeDirector: postConsigneeDirector ?? null };
        }
      }
    }

    res.json(createdContract);
  } catch (error: any) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// PUT /contracts/:id - Shartnoma yangilash
router.put('/:id', requireAuth('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = contractSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Shartnoma mavjudligini tekshirish
    const existingContract = await prisma.contract.findUnique({
      where: { id }
    });

    if (!existingContract) {
      return res.status(404).json({ error: 'Shartnoma topilmadi' });
    }

    // Shartnoma raqami unique bo'lishi kerak (bir xil mijozda, lekin joriy shartnoma bundan mustasno)
    if (data.contractNumber !== existingContract.contractNumber) {
      const duplicateContract = await prisma.contract.findFirst({
        where: {
          clientId: data.clientId,
          contractNumber: data.contractNumber,
          id: { not: id }
        }
      });

      if (duplicateContract) {
        return res.status(400).json({ error: 'Bu shartnoma raqami allaqachon mavjud' });
      }
    }

    // Build contract data object conditionally to avoid TypeScript errors
    // TODO: Regenerate Prisma client after schema changes
    const contractData: any = {
      contractNumber: data.contractNumber,
      contractDate: new Date(data.contractDate),
      sellerName: data.sellerName,
      sellerLegalAddress: data.sellerLegalAddress,
      buyerName: data.buyerName,
      buyerAddress: data.buyerAddress,
      destinationCountry: data.destinationCountry,
    };
    const putBuyerDirector = data.buyerDirector;
    const putConsigneeDirector = data.consigneeDirector;

    // Add optional seller fields
    if (data.sellerDetails !== undefined) contractData.sellerDetails = data.sellerDetails;
    if (data.sellerInn !== undefined) contractData.sellerInn = data.sellerInn;
    if (data.sellerOgrn !== undefined) contractData.sellerOgrn = data.sellerOgrn;
    if (data.sellerBankName !== undefined) contractData.sellerBankName = data.sellerBankName;
    if (data.sellerBankAddress !== undefined) contractData.sellerBankAddress = data.sellerBankAddress;
    if (data.sellerBankAccount !== undefined) contractData.sellerBankAccount = data.sellerBankAccount;
    if (data.sellerBankSwift !== undefined) contractData.sellerBankSwift = data.sellerBankSwift;
    if (data.sellerCorrespondentBank !== undefined) contractData.sellerCorrespondentBank = data.sellerCorrespondentBank;
    if (data.sellerCorrespondentBankAccount !== undefined) contractData.sellerCorrespondentBankAccount = data.sellerCorrespondentBankAccount;
    if (data.sellerCorrespondentBankSwift !== undefined) contractData.sellerCorrespondentBankSwift = data.sellerCorrespondentBankSwift;

    // Add optional buyer fields
    if (data.buyerDetails !== undefined) contractData.buyerDetails = data.buyerDetails;
    if (data.buyerInn !== undefined) contractData.buyerInn = data.buyerInn;
    if (data.buyerOgrn !== undefined) contractData.buyerOgrn = data.buyerOgrn;
    if (data.buyerBankName !== undefined) contractData.buyerBankName = data.buyerBankName;
    if (data.buyerBankAddress !== undefined) contractData.buyerBankAddress = data.buyerBankAddress;
    if (data.buyerBankAccount !== undefined) contractData.buyerBankAccount = data.buyerBankAccount;
    if (data.buyerBankSwift !== undefined) contractData.buyerBankSwift = data.buyerBankSwift;
    if (data.buyerCorrespondentBank !== undefined) contractData.buyerCorrespondentBank = data.buyerCorrespondentBank;
    if (data.buyerCorrespondentBankAccount !== undefined) contractData.buyerCorrespondentBankAccount = data.buyerCorrespondentBankAccount;
    if (data.buyerCorrespondentBankSwift !== undefined) contractData.buyerCorrespondentBankSwift = data.buyerCorrespondentBankSwift;

    // Add optional shipper fields
    if (data.shipperName !== undefined) contractData.shipperName = data.shipperName;
    if (data.shipperAddress !== undefined) contractData.shipperAddress = data.shipperAddress;
    if (data.shipperDetails !== undefined) contractData.shipperDetails = data.shipperDetails;
    if (data.shipperInn !== undefined) contractData.shipperInn = data.shipperInn;
    if (data.shipperOgrn !== undefined) contractData.shipperOgrn = data.shipperOgrn;
    if (data.shipperBankName !== undefined) contractData.shipperBankName = data.shipperBankName;
    if (data.shipperBankAddress !== undefined) contractData.shipperBankAddress = data.shipperBankAddress;
    if (data.shipperBankAccount !== undefined) contractData.shipperBankAccount = data.shipperBankAccount;
    if (data.shipperBankSwift !== undefined) contractData.shipperBankSwift = data.shipperBankSwift;

    // Add optional consignee fields
    if (data.consigneeName !== undefined) contractData.consigneeName = data.consigneeName;
    if (data.consigneeAddress !== undefined) contractData.consigneeAddress = data.consigneeAddress;
    if (data.consigneeDetails !== undefined) contractData.consigneeDetails = data.consigneeDetails;
    if (data.consigneeInn !== undefined) contractData.consigneeInn = data.consigneeInn;
    if (data.consigneeOgrn !== undefined) contractData.consigneeOgrn = data.consigneeOgrn;
    if (data.consigneeBankName !== undefined) contractData.consigneeBankName = data.consigneeBankName;
    if (data.consigneeBankAddress !== undefined) contractData.consigneeBankAddress = data.consigneeBankAddress;
    if (data.consigneeBankAccount !== undefined) contractData.consigneeBankAccount = data.consigneeBankAccount;
    if (data.consigneeBankSwift !== undefined) contractData.consigneeBankSwift = data.consigneeBankSwift;

    // Add optional additional fields
    if (data.deliveryTerms !== undefined) contractData.deliveryTerms = data.deliveryTerms;
    if (data.customsAddress !== undefined) contractData.customsAddress = data.customsAddress;
    if (data.paymentMethod !== undefined) contractData.paymentMethod = data.paymentMethod;
    contractData.contractCurrency = (data.contractCurrency != null && String(data.contractCurrency).trim()) ? String(data.contractCurrency).trim() : 'USD';
    if (data.gln !== undefined) contractData.gln = data.gln;
    if (data.supplierDirector !== undefined) contractData.supplierDirector = data.supplierDirector;
    if (data.goodsReleasedBy !== undefined) contractData.goodsReleasedBy = data.goodsReleasedBy;
    if (data.signatureUrl !== undefined) contractData.signatureUrl = data.signatureUrl;
    if (data.sealUrl !== undefined) contractData.sealUrl = data.sealUrl;
    if (data.sellerSignatureUrl !== undefined) contractData.sellerSignatureUrl = data.sellerSignatureUrl;
    if (data.sellerSealUrl !== undefined) contractData.sellerSealUrl = data.sellerSealUrl;
    if (data.buyerSignatureUrl !== undefined) contractData.buyerSignatureUrl = data.buyerSignatureUrl;
    if (data.buyerSealUrl !== undefined) contractData.buyerSealUrl = data.buyerSealUrl;
    if (data.consigneeSignatureUrl !== undefined) contractData.consigneeSignatureUrl = data.consigneeSignatureUrl;
    if (data.consigneeSealUrl !== undefined) contractData.consigneeSealUrl = data.consigneeSealUrl;
    if (data.specification !== undefined) {
      const spec = Array.isArray(data.specification) ? data.specification : [];
      const toNum = (v: any): number | undefined => {
        if (v == null) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      contractData.specification = spec.map((row: any) => ({
        productName: String(row?.productName ?? ''),
        tnvedCode: row?.tnvedCode != null ? String(row.tnvedCode) : undefined,
        quantity: Number.isFinite(Number(row?.quantity)) ? Number(row.quantity) : 0,
        unit: row?.unit != null ? String(row.unit) : undefined,
        unitPrice: toNum(row?.unitPrice),
        totalPrice: toNum(row?.totalPrice),
        specNumber: row?.specNumber != null ? String(row.specNumber) : undefined,
        productNumber: row?.productNumber != null ? String(row.productNumber) : undefined,
      }));
      console.log('[contracts PUT] specification length:', contractData.specification.length);
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: contractData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (putBuyerDirector !== undefined || putConsigneeDirector !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contract"
        SET "buyerDirector" = ${putBuyerDirector ?? null},
            "consigneeDirector" = ${putConsigneeDirector ?? null}
        WHERE "id" = ${id}
      `;
    }

    if (contractData.specification !== undefined) {
      console.log('[contracts PUT] saved specification length:', Array.isArray(contract.specification) ? (contract.specification as any[]).length : 'not array');
    }
    let updatedContract = contract;
    if (putBuyerDirector !== undefined || putConsigneeDirector !== undefined) {
      (updatedContract as any).buyerDirector = putBuyerDirector ?? null;
      (updatedContract as any).consigneeDirector = putConsigneeDirector ?? null;
    }
    if (contractData.specification !== undefined) {
      const specJson = JSON.stringify(contractData.specification);
      await prisma.$executeRaw`UPDATE "Contract" SET "specification" = ${specJson}::jsonb WHERE "id" = ${id}`;
      const refreshed = await prisma.contract.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });
      if (refreshed) {
        updatedContract = refreshed;
      }
    }
    res.json(updatedContract);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// PATCH /contracts/:id/delivery-terms - Update delivery terms only (any authenticated user)
router.patch('/:id/delivery-terms', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = deliveryTermsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        deliveryTerms: parsed.data.deliveryTerms ?? null,
      },
    });
    res.json(contract);
  } catch (error: any) {
    console.error('Error updating delivery terms:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// DELETE /contracts/:id - Shartnoma o'chirish
router.delete('/:id', requireAuth('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Shartnoma mavjudligini tekshirish
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        invoices: {
          select: { id: true }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Shartnoma topilmadi' });
    }

    // Agar shartnoma invoice'lar bilan bog'langan bo'lsa, o'chirish mumkin emas
    if (contract.invoices.length > 0) {
      return res.status(400).json({ error: 'Bu shartnoma invoice\'lar bilan bog\'langan. Avval invoice\'larni o\'chiring' });
    }

    await prisma.contract.delete({
      where: { id }
    });

    res.json({ message: 'Shartnoma muvaffaqiyatli o\'chirildi' });
  } catch (error: any) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

