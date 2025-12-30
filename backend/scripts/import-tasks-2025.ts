/**
 * CSV fayldan 2025 yil task'larini import qilish
 * 
 * Foydalanish:
 *   cd backend
 *   npx ts-node --transpile-only scripts/import-tasks-2025.ts
 */

import { PrismaClient, Role, Prisma } from '@prisma/client';
import * as fs from 'fs';
import { hashPassword } from '../src/utils/hash';

const prisma = new PrismaClient();

// Stage templates (from tasks.ts)
const stageTemplates = [
  'Invoys',
  'Zayavka',
  'TIR-SMR',
  'ST',
  'Fito',
  'Deklaratsiya',
  'Tekshirish',
  'Topshirish',
  'Pochta',
];

// Worker names
const WORKER_NAMES = ['Abdukamol', 'Ahadbek', 'Hakimjon'];
const WORKER_PAYMENT = 5; // $5 per worker per task

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Format: "DD.MM.YYYY"
  const dateParts = dateStr.split('.');
  if (dateParts.length !== 3) return null;
  
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(dateParts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return new Date(year, month, day, 12, 0, 0); // Set to noon
}

async function findOrCreateBranch(name: string) {
  let branch = await prisma.branch.findFirst({
    where: { name },
  });
  
  if (!branch) {
    branch = await prisma.branch.create({
      data: { name },
    });
    console.log(`  [NEW] Branch yaratildi: ${name}`);
  }
  
  return branch;
}

async function findOrCreateWorker(name: string, branchId: number) {
  let worker = await prisma.user.findFirst({
    where: { name },
  });
  
  if (!worker) {
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@local.test`;
    const passwordHash = await hashPassword('worker123');
    
    worker = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.DEKLARANT, // Using DEKLARANT role for workers
        branchId,
      },
    });
    console.log(`  [NEW] Worker yaratildi: ${name} (Email: ${email})`);
  }
  
  return worker;
}

async function findOrCreateAdmin() {
  let admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });
  
  if (!admin) {
    const email = 'admin@local.test';
    const passwordHash = await hashPassword('admin123');
    
    admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log(`  [NEW] Admin user yaratildi: ${email}`);
  }
  
  return admin;
}

async function findOrCreateClient(name: string) {
  let client = await prisma.client.findFirst({
    where: { name },
  });
  
  if (!client) {
    client = await prisma.client.create({
      data: { name },
    });
    console.log(`  [NEW] Client yaratildi: ${name}`);
  }
  
  return client;
}

async function importTasks() {
  // CSV fayl yo'li - Windows path
  const csvPath = 'c:/Users/11870/OneDrive/Desktop/tasklar.csv';
  
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
  
  // CSV'ni manual parse qilish (semicolon-separated)
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  
  console.log(`CSV ustunlari: ${headers.join(', ')}`);
  
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim() || '';
    });
    records.push(record);
  }
  
  console.log(`Jami ${records.length} ta qator topildi\n`);
  
  // Find or create Oltiariq branch
  const branch = await findOrCreateBranch('Oltiariq');
  
  // Find or create workers
  const workers = await Promise.all(
    WORKER_NAMES.map(name => findOrCreateWorker(name, branch.id))
  );
  console.log(`\n${workers.length} ta worker tayyor\n`);
  
  // Find or create admin user
  const admin = await findOrCreateAdmin();
  console.log('');
  
  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of records) {
    const taskName = row['Task name']?.trim();
    const dateStr = row['Sana']?.trim();
    const clientName = row['Clients']?.trim();
    
    // Skip rows with missing required data
    if (!taskName || !dateStr || !clientName) {
      skipped++;
      continue;
    }
    
    try {
      // Parse date
      const createdAt = parseDate(dateStr);
      if (!createdAt) {
        console.warn(`  [WARN] Sana noto'g'ri format: ${dateStr}, o'tkazib yuborildi`);
        skipped++;
        continue;
      }
      
      // Find or create client
      const client = await findOrCreateClient(clientName);
      
      // Check if task already exists
      const existingTask = await prisma.task.findFirst({
        where: {
          title: taskName,
          clientId: client.id,
        },
      });
      
      if (existingTask) {
        console.log(`  [SKIP] Task allaqachon mavjud: ${taskName} (ID: ${existingTask.id})`);
        skipped++;
        continue;
      }
      
      // Calculate completion time (90 minutes after creation)
      const completionTime = new Date(createdAt.getTime() + 90 * 60 * 1000);
      
      // Create task with all stages in a transaction
      const task = await prisma.$transaction(async (tx) => {
        // Create task
        const newTask = await tx.task.create({
          data: {
            title: taskName,
            clientId: client.id,
            branchId: branch.id,
            createdById: admin.id,
            hasPsr: false,
            createdAt,
            status: 'TAYYOR', // All stages will be completed
            stages: {
              create: stageTemplates.map((stageName, idx) => ({
                name: stageName,
                stageOrder: idx + 1,
                status: 'TAYYOR',
                durationMin: 90,
                completedAt: completionTime,
                // Assign workers to stages - cycle through workers
                assignedToId: workers[idx % workers.length].id,
              })),
            },
          },
          include: {
            stages: true,
          },
        });
        
        // Create KpiLog entries for each worker ($5 per worker per task)
        // Using first stage name (Invoys) for stageName as per plan
        for (const worker of workers) {
          await tx.kpiLog.create({
            data: {
              userId: worker.id,
              taskId: newTask.id,
              stageName: 'Invoys',
              amount: new Prisma.Decimal(WORKER_PAYMENT),
            },
          });
        }
        
        return newTask;
      });
      
      console.log(`  [OK] Task yaratildi: ${taskName} (ID: ${task.id}, Client: ${clientName}, Sana: ${dateStr})`);
      created++;
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`  Processed ${processed} tasks...`);
      }
      
    } catch (error: any) {
      console.error(`  [ERROR] Task: ${taskName}, Xatolik: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n=== Import natijalari ===');
  console.log(`Jami qatorlar: ${records.length}`);
  console.log(`Ishlangan: ${processed}`);
  console.log(`Yaratildi: ${created}`);
  console.log(`O'tkazib yuborildi: ${skipped}`);
  console.log(`Xatolar: ${errors}`);
  console.log(`\nHar bir task uchun ${workers.length} ta worker'ga ${WORKER_PAYMENT}$ to'landi`);
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

