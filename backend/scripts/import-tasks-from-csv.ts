/**
 * CSV fayldan task'larni va stage assignment'larni import qilish
 * 
 * Foydalanish:
 *   cd backend
 *   npx ts-node --transpile-only scripts/import-tasks-from-csv.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Stage nomlari mapping (CSV dagi nomlar -> Database dagi nomlar)
const STAGE_MAPPING: Record<string, string> = {
  'Invoys': 'Invoys',
  'Zayavka': 'Zayavka',
  'TIR-SMR': 'TIR-SMR',
  'ST': 'ST',
  'FITO': 'Fito',
  'Deklaratsiya': 'Deklaratsiya',
  'Xujjat_tekshirish': 'Tekshirish',
  'Xujjat_topshirish': 'Topshirish',
  'Pochta': 'Pochta',
};

// Stage order mapping
const STAGE_ORDER: Record<string, number> = {
  'Invoys': 1,
  'Zayavka': 2,
  'TIR-SMR': 3,
  'ST': 4,
  'Fito': 5,
  'Deklaratsiya': 6,
  'Tekshirish': 7,
  'Topshirish': 8,
  'Pochta': 9,
};

interface TaskData {
  task_id: string;
  client_name: string;
  task_name: string;
  branch_name: string;
  psr: string;
  status: string;
  driver_phone: string;
  deal_amount: string;
  expenses: string;
  creation_date: string;
  stage_assignments: Array<{
    stage_name: string;
    worker_name: string;
    status: string;
  }>;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Format: "24.11.2025 19:57:29"
  const parts = dateStr.split(' ');
  if (parts.length < 1) return null;
  
  const dateParts = parts[0].split('.');
  if (dateParts.length !== 3) return null;
  
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(dateParts[2], 10);
  
  let hours = 0, minutes = 0, seconds = 0;
  if (parts.length > 1) {
    const timeParts = parts[1].split(':');
    if (timeParts.length >= 1) hours = parseInt(timeParts[0], 10);
    if (timeParts.length >= 2) minutes = parseInt(timeParts[1], 10);
    if (timeParts.length >= 3) seconds = parseInt(timeParts[2], 10);
  }
  
  return new Date(year, month, day, hours, minutes, seconds);
}

async function importTasks() {
  // CSV fayl yo'li - Windows path
  const csvPath = 'c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV fayl topilmadi: ${csvPath}`);
    process.exit(1);
  }
  
  console.log('CSV faylni o\'qish...');
  
  // Encoding'ni tekshirish va o'qish
  let content: string;
  const encodings = ['utf-8-sig', 'windows-1251', 'cp1251', 'utf-8', 'latin-1'];
  
  for (const enc of encodings) {
    try {
      content = fs.readFileSync(csvPath, { encoding: enc as BufferEncoding });
      console.log(`Fayl encoding: ${enc}`);
      break;
    } catch (e) {
      continue;
    }
  }
  
  if (!content!) {
    throw new Error("CSV fayl encoding'ini aniqlab bo'lmadi");
  }
  
  // CSV'ni manual parse qilish
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim() || '';
    });
    records.push(record);
  }
  
  console.log(`Jami ${records.length} ta qator topildi`);
  
  let processed = 0;
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  // User name cache
  const userCache = new Map<string, number>();
  
  // Avval barcha user'larni cache'ga yuklash
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  
  for (const user of users) {
    userCache.set(user.name, user.id);
  }
  
  console.log(`User cache: ${userCache.size} ta user`);
  
  for (const row of records) {
    const taskId = row['Task ID']?.trim();
    if (!taskId) continue;
    
    try {
      const taskData: TaskData = {
        task_id: taskId,
        client_name: row['Klient']?.trim() || '',
        task_name: row['Task Name']?.trim() || '',
        branch_name: row['Filial']?.trim() || '',
        psr: row['PSR']?.trim() || '',
        status: row['Status']?.trim() || '',
        driver_phone: row['Shopir Tel raqami']?.trim() || '',
        deal_amount: row['Kelishuv summasi']?.trim() || '',
        expenses: row['Rasxodlar']?.trim() || '',
        creation_date: row['Creation Date']?.trim() || '',
        stage_assignments: [],
      };
      
      // Stage assignment'larni to'plash
      for (const [csvStageName, dbStageName] of Object.entries(STAGE_MAPPING)) {
        const stageStatus = row[csvStageName]?.trim();
        const workerName = row[`${csvStageName}_bajaruvchi`]?.trim();
        
        if (stageStatus === 'Tayyor' && workerName) {
          taskData.stage_assignments.push({
            stage_name: dbStageName,
            worker_name: workerName,
            status: 'TAYYOR',
          });
        }
      }
      
      if (taskData.stage_assignments.length === 0) {
        continue; // Stage assignment'lar bo'lmasa, o'tkazib yuborish
      }
      
      // Branch'ni topish yoki yaratish
      let branch = await prisma.branch.findFirst({
        where: { name: taskData.branch_name },
      });
      
      if (!branch) {
        branch = await prisma.branch.create({
          data: { name: taskData.branch_name },
        });
        console.log(`  [NEW] Branch yaratildi: ${taskData.branch_name}`);
      }
      
      // Client'ni topish yoki yaratish
      let client = await prisma.client.findFirst({
        where: { name: taskData.client_name },
      });
      
      if (!client) {
        client = await prisma.client.create({
          data: {
            name: taskData.client_name,
            phone: taskData.driver_phone || null,
            dealAmount: taskData.deal_amount ? parseFloat(taskData.deal_amount) : null,
          },
        });
        console.log(`  [NEW] Client yaratildi: ${taskData.client_name}`);
      }
      
      // Task'ni topish (title va clientId bo'yicha)
      let task = await prisma.task.findFirst({
        where: {
          title: taskData.task_name,
          clientId: client.id,
        },
        include: {
          stages: true,
        },
      });
      
      if (!task) {
        // Task topilmasa, yaratish (admin user kerak)
        const adminUser = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
        });
        
        if (!adminUser) {
          console.error(`  [ERROR] Admin user topilmadi, task yaratib bo'lmadi: ${taskData.task_name}`);
          errors++;
          continue;
        }
        
        const creationDate = parseDate(taskData.creation_date) || new Date();
        
        task = await prisma.task.create({
          data: {
            title: taskData.task_name,
            clientId: client.id,
            branchId: branch.id,
            createdById: adminUser.id,
            driverPhone: taskData.driver_phone || null,
            hasPsr: taskData.psr ? taskData.psr.toLowerCase().includes('ha') : false,
            snapshotDealAmount: taskData.deal_amount ? parseFloat(taskData.deal_amount) : null,
            createdAt: creationDate,
            stages: {
              create: Object.keys(STAGE_ORDER).map((stageName) => ({
                name: stageName,
                stageOrder: STAGE_ORDER[stageName],
                status: 'BOSHLANMAGAN',
              })),
            },
          },
          include: {
            stages: true,
          },
        });
        
        console.log(`  [NEW] Task yaratildi: ${taskData.task_name} (ID: ${task.id})`);
      }
      
      // Stage assignment'larni update qilish
      for (const stageAssignment of taskData.stage_assignments) {
        const workerId = userCache.get(stageAssignment.worker_name);
        
        if (!workerId) {
          console.warn(`  [WARN] Worker topilmadi: ${stageAssignment.worker_name}`);
          continue;
        }
        
        const stage = task.stages.find((s) => s.name === stageAssignment.stage_name);
        
        if (!stage) {
          console.warn(`  [WARN] Stage topilmadi: ${stageAssignment.stage_name} (Task ID: ${task.id})`);
          continue;
        }
        
        // Stage'ni update qilish
        await prisma.taskStage.update({
          where: { id: stage.id },
          data: {
            status: 'TAYYOR',
            assignedToId: workerId,
            completedAt: new Date(),
          },
        });
      }
      
      updated++;
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`  Processed ${processed} tasks...`);
      }
      
    } catch (error: any) {
      console.error(`  [ERROR] Task ID ${taskId}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n=== Import natijalari ===');
  console.log(`Jami qatorlar: ${records.length}`);
  console.log(`Ishlangan: ${processed}`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`Xatolar: ${errors}`);
}

async function main() {
  try {
    await importTasks();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

