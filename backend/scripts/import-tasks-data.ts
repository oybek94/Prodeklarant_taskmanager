/**
 * Server'da barcha task'lar va stage'lar ma'lumotlarini import qilish
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importTasksData() {
  console.log('Server\'da barcha task\'lar va stage\'lar ma\'lumotlarini import qilish...\n');
  
  // Import fayl yo'li
  const importPath = path.join(__dirname, '../../tasks-export.json');
  
  if (!fs.existsSync(importPath)) {
    console.error(`Import fayl topilmadi: ${importPath}`);
    process.exit(1);
  }
  
  // Import faylni o'qish
  const importData = JSON.parse(fs.readFileSync(importPath, 'utf-8'));
  
  console.log(`Import fayldan ${importData.tasks.length} ta task topildi\n`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  // Client va Branch cache
  const clientCache = new Map<string, number>();
  const branchCache = new Map<string, number>();
  const userCache = new Map<string, number>();
  
  // Cache'larni to'ldirish
  const clients = await prisma.client.findMany();
  clients.forEach(c => clientCache.set(c.name, c.id));
  
  const branches = await prisma.branch.findMany();
  branches.forEach(b => branchCache.set(b.name, b.id));
  
  const users = await prisma.user.findMany();
  users.forEach(u => userCache.set(u.name, u.id));
  
  // Admin user'ni topish
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });
  
  if (!adminUser) {
    console.error('Admin user topilmadi');
    process.exit(1);
  }
  
  // Har bir task'ni import qilish
  for (const taskData of importData.tasks) {
    try {
      // Client'ni topish yoki yaratish
      let clientId = clientCache.get(taskData.clientName);
      if (!clientId) {
        const client = await prisma.client.create({
          data: { name: taskData.clientName },
        });
        clientId = client.id;
        clientCache.set(taskData.clientName, clientId);
      }
      
      // Branch'ni topish yoki yaratish
      let branchId = branchCache.get(taskData.branchName);
      if (!branchId) {
        const branch = await prisma.branch.create({
          data: { name: taskData.branchName },
        });
        branchId = branch.id;
        branchCache.set(taskData.branchName, branchId);
      }
      
      // Task'ni topish yoki yaratish (title va clientId bo'yicha)
      let task = await prisma.task.findFirst({
        where: {
          title: taskData.title,
          clientId: clientId,
        },
        include: {
          stages: true,
        },
      });
      
      // Agar title bo'yicha topilmasa, boshqa usul bilan qidirish
      if (!task) {
        // Task code'ni ajratib olish
        const titleParts = taskData.title.split(/\s+/);
        const taskCode = titleParts.find(p => /^[0-9A-Z]{6,}$/.test(p));
        
        if (taskCode) {
          // Barcha task'larni o'qib, code bo'yicha qidirish
          const allClientTasks = await prisma.task.findMany({
            where: { clientId: clientId },
            include: { stages: true },
          });
          
          task = allClientTasks.find(t => {
            const tParts = t.title.split(/\s+/);
            return tParts.some(p => p === taskCode);
          }) || null;
        }
      }
      
      if (!task) {
        // Task yaratish
        task = await prisma.task.create({
          data: {
            title: taskData.title,
            clientId: clientId,
            branchId: branchId,
            createdById: adminUser.id,
            status: taskData.status as any,
            hasPsr: taskData.hasPsr,
            driverPhone: taskData.driverPhone,
            snapshotDealAmount: taskData.snapshotDealAmount ? parseFloat(taskData.snapshotDealAmount) : null,
            createdAt: new Date(taskData.createdAt),
            stages: {
              create: taskData.stages.map((stage: any) => ({
                name: stage.name,
                stageOrder: stage.stageOrder,
                status: stage.status as any,
                assignedToId: stage.assignedToName ? userCache.get(stage.assignedToName) || null : null,
                durationMin: stage.durationMin,
                completedAt: stage.completedAt ? new Date(stage.completedAt) : null,
              })),
            },
          },
          include: {
            stages: true,
          },
        });
        created++;
        console.log(`  [CREATED] Task ${task.id}: ${taskData.title.substring(0, 40)}...`);
      } else {
        // Task mavjud, stage'lar va duration'larni yangilash
        for (const stageData of taskData.stages) {
          const existingStage = task.stages.find(s => s.name === stageData.name);
          
          if (existingStage) {
            await prisma.taskStage.update({
              where: { id: existingStage.id },
              data: {
                status: stageData.status as any,
                assignedToId: stageData.assignedToName ? userCache.get(stageData.assignedToName) || null : null,
                durationMin: stageData.durationMin,
                completedAt: stageData.completedAt ? new Date(stageData.completedAt) : null,
              },
            });
          } else {
            await prisma.taskStage.create({
              data: {
                taskId: task.id,
                name: stageData.name,
                stageOrder: stageData.stageOrder,
                status: stageData.status as any,
                assignedToId: stageData.assignedToName ? userCache.get(stageData.assignedToName) || null : null,
                durationMin: stageData.durationMin,
                completedAt: stageData.completedAt ? new Date(stageData.completedAt) : null,
              },
            });
          }
        }
        updated++;
        if (updated % 10 === 0) {
          console.log(`  Updated ${updated} tasks...`);
        }
      }
    } catch (error: any) {
      console.error(`  [ERROR] Task ${taskData.id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yaratilgan: ${created}`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`Xatolar: ${errors}`);
}

importTasksData()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

