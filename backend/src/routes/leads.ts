import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/leads — Ro'yxat (filter: stage, assignedToId, search, reminder)
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { stage, assignedToId, search, reminder } = req.query;
        const where: any = {};

        if (stage && stage !== 'ALL') where.stage = stage;
        if (assignedToId) where.assignedToId = Number(assignedToId);
        if (search) {
            where.OR = [
                { companyName: { contains: String(search), mode: 'insensitive' } },
                { inn: { contains: String(search), mode: 'insensitive' } },
                { phone: { contains: String(search), mode: 'insensitive' } },
                { contactPerson: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        if (reminder === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            where.nextCallAt = { gte: todayStart, lte: todayEnd };
        }

        const leads = await prisma.lead.findMany({
            where,
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json(leads);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leads/stats — Admin statistika
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [
            totalLeads,
            byStageCold,
            byStageInProgress,
            byStageMeeting,
            byStageFollowUp,
            byStageWon,
            byStageLost,
            todayActivities,
            todayMeetings,
        ] = await Promise.all([
            prisma.lead.count(),
            prisma.lead.count({ where: { stage: 'COLD' } }),
            prisma.lead.count({ where: { stage: 'IN_PROGRESS' } }),
            prisma.lead.count({ where: { stage: 'MEETING' } }),
            prisma.lead.count({ where: { stage: 'FOLLOW_UP' } }),
            prisma.lead.count({ where: { stage: 'CLOSED_WON' } }),
            prisma.lead.count({ where: { stage: 'CLOSED_LOST' } }),
            prisma.leadActivity.count({
                where: { createdAt: { gte: todayStart, lte: todayEnd } },
            }),
            prisma.lead.count({
                where: { stage: 'MEETING', updatedAt: { gte: todayStart, lte: todayEnd } },
            }),
        ]);

        // Sotuvchi samaradorligi
        const sellerStats = await prisma.lead.groupBy({
            by: ['assignedToId'],
            _count: { id: true },
            where: { assignedToId: { not: null } },
        });

        const sellerIds = sellerStats.map((s) => s.assignedToId!);
        const sellers = await prisma.user.findMany({
            where: { id: { in: sellerIds } },
            select: { id: true, name: true },
        });

        const wonStats = await prisma.lead.groupBy({
            by: ['assignedToId'],
            _count: { id: true },
            where: { assignedToId: { not: null }, stage: 'CLOSED_WON' },
        });

        const sellerPerformance = sellers.map((s) => ({
            id: s.id,
            name: s.name,
            total: sellerStats.find((x) => x.assignedToId === s.id)?._count.id ?? 0,
            won: wonStats.find((x) => x.assignedToId === s.id)?._count.id ?? 0,
        }));

        // So'nggi 7 kun faoliyat
        const last7Days: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d); start.setHours(0, 0, 0, 0);
            const end = new Date(d); end.setHours(23, 59, 59, 999);
            const count = await prisma.leadActivity.count({
                where: { createdAt: { gte: start, lte: end } },
            });
            last7Days.push({ date: d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }), count });
        }

        res.json({
            totalLeads,
            byStage: {
                COLD: byStageCold,
                IN_PROGRESS: byStageInProgress,
                MEETING: byStageMeeting,
                FOLLOW_UP: byStageFollowUp,
                CLOSED_WON: byStageWon,
                CLOSED_LOST: byStageLost,
            },
            todayActivities,
            todayMeetings,
            sellerPerformance,
            last7Days,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leads/:id — Bitta lid
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                assignedTo: { select: { id: true, name: true } },
                activities: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!lead) return res.status(404).json({ error: 'Lid topilmadi' });
        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/leads — Yangi lid
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { companyName, inn, productType, phone, contactPerson, assignedToId } = req.body;
        if (!companyName) return res.status(400).json({ error: 'companyName majburiy' });

        const lead = await prisma.lead.create({
            data: {
                companyName,
                inn: inn || null,
                productType: productType || null,
                phone: phone || null,
                contactPerson: contactPerson || null,
                assignedToId: assignedToId ? Number(assignedToId) : null,
            },
            include: { assignedTo: { select: { id: true, name: true } } },
        });

        // Faoliyat yozing
        if (req.user) {
            await prisma.leadActivity.create({
                data: {
                    leadId: lead.id,
                    userId: req.user.id,
                    type: 'created',
                    note: 'Lid yaratildi',
                },
            });
        }

        res.status(201).json(lead);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/leads/:id — Yangilash
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { companyName, inn, productType, phone, contactPerson, stage, assignedToId, lostReason, nextCallAt } = req.body;

        const existing = await prisma.lead.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Lid topilmadi' });

        const data: any = {};
        if (companyName !== undefined) data.companyName = companyName;
        if (inn !== undefined) data.inn = inn;
        if (productType !== undefined) data.productType = productType;
        if (phone !== undefined) data.phone = phone;
        if (contactPerson !== undefined) data.contactPerson = contactPerson;
        if (stage !== undefined) data.stage = stage;
        if (assignedToId !== undefined) data.assignedToId = assignedToId ? Number(assignedToId) : null;
        if (lostReason !== undefined) data.lostReason = lostReason;
        if (nextCallAt !== undefined) data.nextCallAt = nextCallAt ? new Date(nextCallAt) : null;

        const lead = await prisma.lead.update({
            where: { id },
            data,
            include: { assignedTo: { select: { id: true, name: true } } },
        });

        // Bosqich o'zgargan bo'lsa faoliyat yozish
        if (stage && stage !== existing.stage && req.user) {
            const stageLabels: Record<string, string> = {
                COLD: 'Yangi',
                IN_PROGRESS: 'Aloqaga chiqildi',
                MEETING: 'Uchrashuv belgilandi',
                FOLLOW_UP: "O'ylanyapti",
                CLOSED_WON: 'Mijoz',
                CLOSED_LOST: 'Rad etdi',
            };
            await prisma.leadActivity.create({
                data: {
                    leadId: id,
                    userId: req.user.id,
                    type: 'stage_change',
                    note: `Bosqich: ${stageLabels[existing.stage] || existing.stage} → ${stageLabels[stage] || stage}${lostReason ? ` (Sabab: ${lostReason})` : ''}`,
                },
            });
        }

        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = Number(req.params.id);
        await prisma.lead.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leads/:id/activities — Faoliyat tarixi
router.get('/:id/activities', async (req: AuthRequest, res: Response) => {
    try {
        const activities = await prisma.leadActivity.findMany({
            where: { leadId: Number(req.params.id) },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(activities);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/leads/:id/activities — Izoh / qo'ng'iroq yozish
router.post('/:id/activities', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { type, note } = req.body;
        if (!type) return res.status(400).json({ error: 'type majburiy' });

        const activity = await prisma.leadActivity.create({
            data: {
                leadId: Number(req.params.id),
                userId: req.user.id,
                type,
                note: note || null,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        res.status(201).json(activity);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/leads/import — CSV/Excel yuklash
router.post('/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const created: any[] = [];
        for (const row of rows) {
            const companyName =
                row['Firma nomi'] || row['companyName'] || row['company_name'] || row['Компания'] || '';
            if (!companyName) continue;

            const lead = await prisma.lead.create({
                data: {
                    companyName: String(companyName).trim(),
                    inn: String(row['STIR'] || row['INN'] || row['inn'] || '').trim() || null,
                    productType: String(row['Mahsulot'] || row['productType'] || row['product'] || '').trim() || null,
                    phone: String(row['Telefon'] || row['phone'] || '').trim() || null,
                    contactPerson: String(row['Mas\'ul'] || row['contactPerson'] || row['contact'] || '').trim() || null,
                },
            });
            created.push(lead);
        }

        if (req.user) {
            await prisma.leadActivity.createMany({
                data: created.map((l) => ({
                    leadId: l.id,
                    userId: req.user!.id,
                    type: 'import',
                    note: 'Excel/CSV orqali import qilindi',
                })),
            });
        }

        res.json({ imported: created.length, leads: created });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
