/**
 * Local database'dan barcha task'lar va stage'lar ma'lumotlarini export qilish
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportTasksData() {
  console.log('Local database\'dan barcha task\'lar va stage\'lar ma\'lumotlarini export qilish...\n');
  
  // Barcha task'larni olish
  const tasks = await prisma.task.findMany({
    include: {
      client: {
        select: {
          name: true,
        },
      },
      branch: {
        select: {
          name: true,
        },
      },
      stages: {
        include: {
          assignedTo: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          stageOrder: 'asc',
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });
  
  console.log(`Jami ${tasks.length} ta task topildi\n`);
  
  // Export data
  const exportData = {
    tasks: tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      clientName: task.client.name,
      branchName: task.branch.name,
      hasPsr: task.hasPsr,
      driverPhone: task.driverPhone,
      snapshotDealAmount: task.snapshotDealAmount?.toString(),
      createdAt: task.createdAt.toISOString(),
      stages: task.stages.map(stage => ({
        name: stage.name,
        status: stage.status,
        stageOrder: stage.stageOrder,
        assignedToName: stage.assignedTo?.name || null,
        durationMin: stage.durationMin,
        completedAt: stage.completedAt?.toISOString() || null,
      })),
    })),
  };
  
  // JSON faylga yozish
  const exportPath = path.join(__dirname, '../../tasks-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`Export qilindi: ${exportPath}`);
  console.log(`Jami task'lar: ${tasks.length}`);
  console.log(`Jami stage'lar: ${tasks.reduce((sum, t) => sum + t.stages.length, 0)}`);
}

exportTasksData()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

