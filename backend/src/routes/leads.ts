import { Router, Request, Response } from 'express';
import { notify, getAdminUserIds } from '../services/notificationService';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { uploadConversation } from '../middleware/upload';
import { ConversationAnalyzerService } from '../ai/conversation.analyzer';
import path from 'path';
import fs from 'fs';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/leads — Ro'yxat (filter: stage, assignedToId, search, reminder)
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { stage, assignedToId, search, reminder, region, productType, exportVolume, exportedCountries, partners } = req.query;
        console.log('Fetching leads with filters:', { stage, assignedToId, search, reminder, region, productType, exportVolume, exportedCountries, partners });
        const where: any = {};

        if (stage && stage !== 'ALL') where.stage = stage;
        if (assignedToId) where.assignedToId = Number(assignedToId);

        if (region) {
            where.region = { contains: String(region), mode: 'insensitive' };
        }
        if (productType) {
            where.productType = { contains: String(productType), mode: 'insensitive' };
        }
        if (exportedCountries) {
            where.exportedCountries = { contains: String(exportedCountries), mode: 'insensitive' };
        }
        if (partners) {
            where.partners = { contains: String(partners), mode: 'insensitive' };
        }

        if (search) {
            where.OR = [
                { companyName: { contains: String(search), mode: 'insensitive' } },
                { inn: { contains: String(search), mode: 'insensitive' } },
                { phone: { contains: String(search), mode: 'insensitive' } },
                { contactPerson: { contains: String(search), mode: 'insensitive' } },
                { region: { contains: String(search), mode: 'insensitive' } },
                { district: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        if (reminder === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            where.nextCallAt = { gte: todayStart, lte: todayEnd };
        }

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 25;
        const skip = (page - 1) * limit;

        if (exportVolume) {
            // Need to fetch all and filter in memory because estimatedExportVolume is a string field
            // that we need to treat as a number for filtering.
            let leads = await prisma.lead.findMany({
                where,
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    activities: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { note: true, createdAt: true, type: true }
                    },
                    _count: { select: { activities: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            leads = leads.filter(l => {
                const vol = Number(l.estimatedExportVolume);
                if (isNaN(vol)) return false;
                if (exportVolume === 'low') return vol < 10;
                if (exportVolume === 'medium') return vol >= 10 && vol <= 30;
                if (exportVolume === 'high') return vol > 30;
                return true;
            });

            const total = leads.length;
            const paginatedLeads = leads.slice(skip, skip + limit);

            return res.json({
                data: paginatedLeads,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            });
        }

        // Standard DB-level pagination
        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    activities: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { note: true, createdAt: true, type: true }
                    },
                    _count: { select: { activities: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.lead.count({ where })
        ]);

        res.json({
            data: leads,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
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
            byStageWrongNumber,
            byStageUnreachable,
            todayActivities,
            todayMeetings,
            todayMeetingsList,
            todayCallsList,
        ] = await Promise.all([
            prisma.lead.count(),
            prisma.lead.count({ where: { stage: 'COLD' } }),
            prisma.lead.count({ where: { stage: 'IN_PROGRESS' } }),
            prisma.lead.count({ where: { stage: 'MEETING' } }),
            prisma.lead.count({ where: { stage: 'FOLLOW_UP' } }),
            prisma.lead.count({ where: { stage: 'CLOSED_WON' } }),
            prisma.lead.count({ where: { stage: 'CLOSED_LOST' } }),
            prisma.lead.count({ where: { stage: 'WRONG_NUMBER' } }),
            prisma.lead.count({ where: { stage: 'UNREACHABLE' } }),
            prisma.leadActivity.count({
                where: { createdAt: { gte: todayStart, lte: todayEnd } },
            }),
            prisma.lead.count({
                where: { 
                    nextCallAt: { gte: todayStart, lte: todayEnd },
                    stage: 'MEETING'
                },
            }),
            prisma.lead.findMany({
                where: { 
                    nextCallAt: { not: null },
                    stage: 'MEETING'
                },
                select: { id: true, companyName: true, contactPerson: true, phone: true, nextCallAt: true },
                orderBy: { nextCallAt: 'asc' },
                take: 20
            }),
            prisma.lead.findMany({
                where: { 
                    nextCallAt: { not: null },
                    stage: { in: ['COLD', 'IN_PROGRESS', 'FOLLOW_UP'] }
                },
                select: { id: true, companyName: true, contactPerson: true, phone: true, nextCallAt: true },
                orderBy: { nextCallAt: 'asc' },
                take: 20
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
                WRONG_NUMBER: byStageWrongNumber,
                UNREACHABLE: byStageUnreachable,
            },
            todayActivities,
            todayMeetings,
            todayMeetingsList,
            todayCallsList,
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
        const { companyName, inn, productType, phone, contactPerson, assignedToId, estimatedExportVolume, region, district, exportedCountries, partners } = req.body;
        if (!companyName) return res.status(400).json({ error: 'companyName majburiy' });

        const lead = await prisma.lead.create({
            data: {
                companyName,
                inn: inn || null,
                productType: productType || null,
                phone: phone || null,
                contactPerson: contactPerson || null,
                assignedToId: assignedToId ? Number(assignedToId) : null,
                estimatedExportVolume: (estimatedExportVolume && !isNaN(Number(estimatedExportVolume)))
                    ? String(Math.round(Number(estimatedExportVolume)))
                    : (estimatedExportVolume || null),
                region: region || null,
                district: district || null,
                exportedCountries: exportedCountries || null,
                partners: partners || null,
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
        const {
            companyName, inn, productType, phone, contactPerson, stage,
            assignedToId, lostReason, nextCallAt, estimatedExportVolume,
            region, district, exportedCountries, partners
        } = req.body;

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

        if (estimatedExportVolume !== undefined) {
            if (estimatedExportVolume && !isNaN(Number(estimatedExportVolume))) {
                data.estimatedExportVolume = String(Math.round(Number(estimatedExportVolume)));
            } else {
                data.estimatedExportVolume = estimatedExportVolume;
            }
        }

        if (region !== undefined) data.region = region;
        if (district !== undefined) data.district = district;
        if (exportedCountries !== undefined) data.exportedCountries = exportedCountries;
        if (partners !== undefined) data.partners = partners;

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
                WRONG_NUMBER: "Raqam xato",
                UNREACHABLE: "O'chiq / Ko'tarmadi",
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

        // Uchrashuv belgilanayotganda adminga bildirishnoma yuborish
        const justBecameMeeting = stage === 'MEETING' && existing.stage !== 'MEETING';
        const timeUpdatedWhileMeeting = nextCallAt !== undefined && lead.stage === 'MEETING' && 
                                  existing.nextCallAt?.toISOString() !== lead.nextCallAt?.toISOString();

        if ((justBecameMeeting || timeUpdatedWhileMeeting) && lead.nextCallAt) {
            const timeStr = new Date(lead.nextCallAt).toLocaleString('uz-UZ', {timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}).replace(',', '');
                
            const isUpdate = !justBecameMeeting && timeUpdatedWhileMeeting;
            const title = isUpdate && existing.nextCallAt ? "Uchrashuv vaqti yangilandi" : "Yangi uchrashuv belgilandi";
            const message = isUpdate && existing.nextCallAt 
                ? `${lead.companyName} bilan uchrashuv vaqti o'zgardi. Yangi vaqt: ${timeStr}. Muloqot uchun: ${lead.contactPerson || '-'}`
                : `${lead.companyName} bilan uchrashuv belgilandi. Vaqti: ${timeStr}. Muloqot uchun: ${lead.contactPerson || '-'}`;

            const adminIds = await getAdminUserIds();
            if (adminIds.length > 0) {
                await notify({
                    userIds: adminIds,
                    type: 'STAGE_UPDATED',
                    title,
                    message,
                    actionUrl: `/leads/${lead.id}`,
                    excludeUserId: req.user?.id
                });
            }
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

        // Use raw array to handle duplicate columns like "Viloyat"
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) return res.status(400).json({ error: 'Faylda ma\'lumot yo\'q' });

        // Header mapping based on order:
        // 0: Firma nomi, 1: Viloyat, 2: Viloyat (Tuman), 3: STIR, 4: Telefon, 5: Mas'ul, 6: Tahminiy hajmi, 7: Turkumi, 8: Export qilgan davlatlari, 9: Xamkorlari

        const created: any[] = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const companyName = String(row[0] || '').trim();
            if (!companyName) continue;

            const rawVolume = row[6];
            let volume = String(rawVolume || '').trim();
            if (typeof rawVolume === 'number') {
                volume = String(Math.round(rawVolume));
            } else if (volume && !isNaN(Number(volume))) {
                volume = String(Math.round(Number(volume)));
            }

            const lead = await prisma.lead.create({
                data: {
                    companyName,
                    region: String(row[1] || '').trim() || null,
                    district: String(row[2] || '').trim() || null,
                    inn: String(row[3] || '').trim() || null,
                    phone: String(row[4] || '').trim() || null,
                    contactPerson: String(row[5] || '').trim() || null,
                    estimatedExportVolume: volume || null,
                    productType: String(row[7] || '').trim() || null,
                    exportedCountries: String(row[8] || '').trim() || null,
                    partners: String(row[9] || '').trim() || null,
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

// ============================
// CONVERSATION (Suhbat) ENDPOINTS
// ============================

// POST /api/leads/:id/conversations/upload — Audio suhbat yuklash
router.post('/:id/conversations/upload', (req: AuthRequest, res: Response, next) => {
    uploadConversation(req, res, (err) => {
        if (err) {
            console.error('Conversation upload error:', err);
            return res.status(400).json({ error: err.message || 'Audio yuklashda xatolik' });
        }
        next();
    });
}, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'Audio fayl yuborilmadi' });

        const leadId = Number(req.params.id);
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return res.status(404).json({ error: 'Lid topilmadi' });

        const audioUrl = `/uploads/conversations/${req.file.filename}`;

        // DB da yozuv yaratish
        const conversation = await prisma.leadConversation.create({
            data: {
                leadId,
                audioUrl,
                audioFileName: req.file.originalname || req.file.filename,
                status: 'TRANSCRIBING',
                uploadedById: req.user.id,
            },
        });

        // Darhol response qaytarish (background da tahlil qilinadi)
        res.status(201).json({
            success: true,
            conversation: {
                id: conversation.id,
                status: conversation.status,
                audioFileName: conversation.audioFileName,
            },
        });

        // Background: Whisper + GPT-4o tahlil
        const filePath = path.join(__dirname, '../../uploads/conversations', req.file.filename);

        try {
            // 1. Whisper — audio → matn
            console.log(`[Conversation] Transcribing audio for conversation #${conversation.id}...`);
            const transcript = await ConversationAnalyzerService.transcribeAudio(filePath);

            await prisma.leadConversation.update({
                where: { id: conversation.id },
                data: { transcript, status: 'ANALYZING' },
            });

            // 2. GPT-4o — tahlil
            console.log(`[Conversation] Analyzing conversation #${conversation.id}...`);
            const analysis = await ConversationAnalyzerService.analyzeConversation(transcript, {
                companyName: lead.companyName,
                productType: lead.productType,
                region: lead.region,
            });

            await prisma.leadConversation.update({
                where: { id: conversation.id },
                data: {
                    sentiment: analysis.sentiment as any,
                    keyInsights: analysis.keyInsights as any,
                    compliance: analysis.compliance as any,
                    summary: analysis.summary,
                    status: 'DONE',
                },
            });

            // Activity log ga yozish
            await prisma.leadActivity.create({
                data: {
                    leadId,
                    userId: req.user!.id,
                    type: 'call',
                    note: `🎙️ AI Suhbat tahlili: ${analysis.summary}`,
                },
            });

            console.log(`[Conversation] Analysis complete for conversation #${conversation.id}`);
        } catch (aiError: any) {
            console.error(`[Conversation] AI error for conversation #${conversation.id}:`, aiError);
            await prisma.leadConversation.update({
                where: { id: conversation.id },
                data: {
                    status: 'ERROR',
                    errorMessage: aiError.message || 'AI tahlil xatoligi',
                },
            });
        }
    } catch (err: any) {
        console.error('Conversation upload error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

// GET /api/leads/:id/conversations — Barcha suhbatlar
router.get('/:id/conversations', async (req: AuthRequest, res: Response) => {
    try {
        const conversations = await prisma.leadConversation.findMany({
            where: { leadId: Number(req.params.id) },
            include: { uploadedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(conversations);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leads/:id/conversations/:convId — Bitta suhbat tahlili
router.get('/:id/conversations/:convId', async (req: AuthRequest, res: Response) => {
    try {
        const conversation = await prisma.leadConversation.findFirst({
            where: {
                id: Number(req.params.convId),
                leadId: Number(req.params.id),
            },
            include: { uploadedBy: { select: { id: true, name: true } } },
        });
        if (!conversation) return res.status(404).json({ error: 'Suhbat topilmadi' });
        res.json(conversation);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/leads/:id/conversations/:convId — Suhbatni o'chirish
router.delete('/:id/conversations/:convId', async (req: AuthRequest, res: Response) => {
    try {
        const conversation = await prisma.leadConversation.findFirst({
            where: {
                id: Number(req.params.convId),
                leadId: Number(req.params.id),
            },
        });
        if (!conversation) return res.status(404).json({ error: 'Suhbat topilmadi' });

        // Faylni o'chirish
        try {
            const filePath = path.join(__dirname, '../../', conversation.audioUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (e) {
            console.warn('Audio fayl o\'chirilmadi:', e);
        }

        await prisma.leadConversation.delete({ where: { id: conversation.id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
