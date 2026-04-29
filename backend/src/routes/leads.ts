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
import { socketEmitter } from '../services/socketEmitter';

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

        const processLeads = async (leadsList: any[]) => {
            const wonLeads = leadsList.filter((l: any) => l.stage === 'CLOSED_WON');
            if (wonLeads.length > 0) {
                const searchNames = wonLeads.filter((l: any) => !l.clientId).map((l: any) => l.companyName);
                const searchPhones = [...new Set(wonLeads.filter((l: any) => !l.clientId && l.phone).map((l: any) => l.phone))];
                const clientIds = wonLeads.map((l: any) => l.clientId).filter(Boolean);
                
                const matchedClients = await prisma.client.findMany({
                    where: {
                        OR: [
                            ...(clientIds.length > 0 ? [{ id: { in: clientIds } }] : []),
                            ...(searchNames.length > 0 ? [{ name: { in: searchNames } }] : []),
                            ...(searchPhones.length > 0 ? [{ phone: { in: searchPhones as string[] } }] : [])
                        ]
                    },
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        _count: { select: { invoices: true } }
                    }
                });

                for (const lead of wonLeads) {
                    if (lead.clientId) {
                        const client = matchedClients.find(c => c.id === lead.clientId);
                        lead.invoicesCount = client?._count?.invoices || 0;
                    } else {
                        const client = matchedClients.find(c => 
                            c.name === lead.companyName || 
                            (lead.phone && c.phone === lead.phone)
                        );
                        lead.invoicesCount = client?._count?.invoices || 0;
                    }
                }
            }
            return leadsList;
        };

        const sortField = req.query.sortField as string;
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        
        let orderBy: any = { updatedAt: 'desc' };
        if (sortField && ['companyName', 'region', 'estimatedExportVolume', 'exportedCountries', 'partners', 'stage', 'nextCallAt'].includes(sortField)) {
            orderBy = { [sortField]: sortOrder };
        }

        const needsMemoryHandling = exportVolume || (sortField && ['companyName', 'region', 'estimatedExportVolume', 'exportedCountries', 'partners', 'stage'].includes(sortField));

        if (needsMemoryHandling) {
            // Fetch lightweight objects to minimize RAM usage and DB load before memory processing
            let bareLeads = await prisma.lead.findMany({
                where,
                select: { id: true, estimatedExportVolume: true, companyName: true, region: true, exportedCountries: true, partners: true, stage: true },
                orderBy: (!sortField || sortField === 'updatedAt' || sortField === 'createdAt' || sortField === 'nextCallAt') ? orderBy : undefined,
            });

            if (exportVolume) {
                bareLeads = bareLeads.filter(l => {
                    const vol = Number(l.estimatedExportVolume);
                    if (isNaN(vol)) return false;
                    if (exportVolume === 'low') return vol < 10;
                    if (exportVolume === 'medium') return vol >= 10 && vol <= 30;
                    if (exportVolume === 'high') return vol > 30;
                    return true;
                });
            }

            if (sortField && ['companyName', 'region', 'estimatedExportVolume', 'exportedCountries', 'partners', 'stage'].includes(sortField)) {
                bareLeads.sort((a: any, b: any) => {
                    if (sortField === 'estimatedExportVolume') {
                        const diff = Number(a.estimatedExportVolume || 0) - Number(b.estimatedExportVolume || 0);
                        return sortOrder === 'asc' ? diff : -diff;
                    } else {
                        const valA = String(a[sortField] || '').toLowerCase();
                        const valB = String(b[sortField] || '').toLowerCase();
                        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                        return 0;
                    }
                });
            }

            const total = bareLeads.length;
            const paginatedIds = bareLeads.slice(skip, skip + limit).map(l => l.id);

            // Now fetch the full objects only for the paginated slice
            const fetchedLeads = await prisma.lead.findMany({
                where: { id: { in: paginatedIds } },
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    activities: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { note: true, createdAt: true, type: true }
                    },
                    _count: { select: { activities: true } },
                }
            });

            // Re-order exactly to the paginated IDs
            const finalSortedLeads = paginatedIds.map(id => fetchedLeads.find(l => l.id === id)!);
            const processedFinal = await processLeads(finalSortedLeads);

            return res.json({
                data: processedFinal,
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
                orderBy,
                skip,
                take: limit,
            }),
            prisma.lead.count({ where })
        ]);
        
        const processedLeads = await processLeads(leads);

        res.json({
            data: processedLeads,
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
            region, district, exportedCountries, partners, clientId
        } = req.body;

        const existing = await prisma.lead.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Lid topilmadi' });

        const data: any = {};
        if (companyName !== undefined) data.companyName = companyName;
        if (clientId !== undefined) data.clientId = clientId;
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
            const currentActivity = await prisma.leadActivity.create({
                data: {
                    leadId: id,
                    userId: req.user.id,
                    type: 'stage_change',
                    note: `Bosqich: ${stageLabels[existing.stage] || existing.stage} → ${stageLabels[stage] || stage}${lostReason ? ` (Sabab: ${lostReason})` : ''}`,
                },
            });

            // === AVTOMATIK BONUS: Uchrashuv belgilanganda ===
            if (stage === 'MEETING' && existing.stage !== 'MEETING') {
                const sellerId = lead.assignedToId || req.user.id;
                try {
                    await prisma.sellerBonus.create({
                        data: {
                            userId: sellerId,
                            type: 'PHONE_MEETING',
                            amount: 10000,
                            leadId: id,
                            note: `${lead.companyName} bilan uchrashuv belgilandi`,
                        },
                    });
                    console.log(`[SellerKPI] PHONE_MEETING bonus: ${sellerId}, lead: ${id}`);
                } catch (bonusErr) {
                    console.error('[SellerKPI] Bonus yaratishda xatolik:', bonusErr);
                }
            }

            if (stage === 'CLOSED_WON') {
                // Sotuvchini aniqlash (aloqa o'rnatgan yoki uchrashuv belgilagan xodim)
                let actualSellerName = lead.assignedTo?.name || req.user.name;
                
                const realSellerActivity = await prisma.leadActivity.findFirst({
                    where: {
                        leadId: id,
                        id: { not: currentActivity.id },
                        type: { not: 'import' }
                    },
                    orderBy: { createdAt: 'desc' },
                    include: { user: true }
                });

                if (realSellerActivity?.user?.name) {
                    actualSellerName = realSellerActivity.user.name;
                }

                const adminIds = await getAdminUserIds();
                const notifyUserIds = new Set<number>(adminIds);
                if (lead.assignedToId) notifyUserIds.add(lead.assignedToId);
                if (realSellerActivity?.userId) notifyUserIds.add(realSellerActivity.userId);
                notifyUserIds.add(req.user.id);

                const notificationPayload = {
                    leadId: lead.id,
                    companyName: lead.companyName,
                    sellerName: actualSellerName,
                    amount: lead.estimatedExportVolume,
                    isLeadWonCelebration: true
                };

                const notifyPromises = Array.from(notifyUserIds).map(async (userId) => {
                    socketEmitter.toUser(userId, 'LEAD_WON', notificationPayload);
                    
                    await prisma.notification.create({
                        data: {
                            userId: userId,
                            type: 'SYSTEM',
                            title: 'Muvaffaqiyatli Kelishuv',
                            message: `${lead.companyName} bilan shartnoma tuzildi!`,
                            metadata: notificationPayload
                        }
                    });
                });
                
                await Promise.all(notifyPromises);

                // === AVTOMATIK BONUS: Shartnoma tuzilganda ===
                const sellerId = lead.assignedToId || realSellerActivity?.userId || req.user.id;
                const exportVol = Number(lead.estimatedExportVolume) || 0;
                let bonusType: 'CONTRACT_SMALL' | 'CONTRACT_MEDIUM' | 'CONTRACT_LARGE';
                let bonusAmount: number;

                if (exportVol > 50) {
                    bonusType = 'CONTRACT_LARGE';
                    bonusAmount = 1200000;
                } else if (exportVol >= 20) {
                    bonusType = 'CONTRACT_MEDIUM';
                    bonusAmount = 600000;
                } else {
                    bonusType = 'CONTRACT_SMALL';
                    bonusAmount = 300000;
                }

                try {
                    await prisma.sellerBonus.create({
                        data: {
                            userId: sellerId,
                            type: bonusType,
                            amount: bonusAmount,
                            leadId: id,
                            note: `${lead.companyName} shartnoma tuzildi. Eksport hajmi: ${exportVol}. Bonus: ${bonusAmount.toLocaleString()} so'm`,
                        },
                    });
                    console.log(`[SellerKPI] ${bonusType} bonus: ${sellerId}, amount: ${bonusAmount}, lead: ${id}`);
                } catch (bonusErr) {
                    console.error('[SellerKPI] Shartnoma bonus xatolik:', bonusErr);
                }
            }
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

// DELETE /api/leads/:id/activities/:activityId — Faoliyatni o'chirish (Admin uchun)
router.delete('/:id/activities/:activityId', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Faqat adminlar o\'chira oladi' });
        }
        const activityId = Number(req.params.activityId);
        await prisma.leadActivity.delete({ where: { id: activityId } });
        res.json({ success: true });
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
