import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

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
  paymentMethod: z.string().optional(),
  gln: z.string().optional(), // Глобальный идентификационный номер GS1 (GLN)
});

// GET /contracts/client/:clientId - Mijozning barcha shartnomalari
router.get('/client/:clientId', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const contracts = await prisma.contract.findMany({
      where: { clientId },
      orderBy: { contractDate: 'desc' }
    });

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

    res.json(contract);
  } catch (error: any) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /contracts - Yangi shartnoma yaratish
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res: Response) => {
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
    if (data.paymentMethod !== undefined) contractData.paymentMethod = data.paymentMethod;
    if (data.gln !== undefined) contractData.gln = data.gln;

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

    res.json(contract);
  } catch (error: any) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// PUT /contracts/:id - Shartnoma yangilash
router.put('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res: Response) => {
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
    if (data.paymentMethod !== undefined) contractData.paymentMethod = data.paymentMethod;
    if (data.gln !== undefined) contractData.gln = data.gln;

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

    res.json(contract);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// DELETE /contracts/:id - Shartnoma o'chirish
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res: Response) => {
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

