/**
 * Barcha task nomlarini to'g'ri encoding bilan yangilash
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

async function fixAllTaskTitles() {
  console.log('Barcha task nomlarini to\'g\'ri encoding bilan yangilash...\n');
  
  // CSV fayl yo'li
  const csvPath = 'c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV fayl topilmadi: ${csvPath}`);
    process.exit(1);
  }
  
  // CSV faylni to'g'ri encoding bilan o'qish
  const buffer = fs.readFileSync(csvPath);
  const fileContent = iconv.decode(buffer, 'win1251');
  console.log(`CSV fayl o'qildi (windows-1251 encoding)\n`);
  
  // CSV'ni parse qilish
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  const taskNameIdx = headers.findIndex(h => h.includes('Task Name'));
  const taskIdIdx = headers.findIndex(h => h.includes('Task ID'));
  const clientNameIdx = headers.findIndex(h => h.includes('Klient'));
  
  // CSV ma'lumotlarini map qilish (client name + task code bo'yicha)
  const csvTasks = new Map<string, string>(); // key: clientName_taskCode, value: taskName
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const taskName = values[taskNameIdx]?.trim();
    const clientName = values[clientNameIdx]?.trim();
    
    if (!taskName || !clientName) continue;
    
    // Task code'ni ajratib olish
    const taskCode = taskName.split(/\s+/).find(p => /^[0-9A-Z]{6,}$/.test(p));
    if (taskCode) {
      const key = `${clientName}_${taskCode}`;
      csvTasks.set(key, taskName);
    }
  }
  
  console.log(`CSV'dan ${csvTasks.size} ta task topildi\n`);
  
  // Database'dagi barcha task'larni olish
  const allTasks = await prisma.task.findMany({
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
  });
  
  console.log(`Database'dan ${allTasks.length} ta task topildi\n`);
  
  let updated = 0;
  let notFound = 0;
  
  // Har bir task'ni yangilash
  for (const task of allTasks) {
    const titleParts = task.title.split(/\s+/).filter(p => p.trim());
    const taskCode = titleParts.find(p => /^[0-9A-Z]{6,}$/.test(p));
    
    if (!taskCode) {
      continue; // Task code topilmadi
    }
    
    const key = `${task.client.name}_${taskCode}`;
    const csvTaskName = csvTasks.get(key);
    
    if (csvTaskName && task.title !== csvTaskName) {
      await prisma.task.update({
        where: { id: task.id },
        data: { title: csvTaskName },
      });
      
      console.log(`  [UPDATED] Task ${task.id}: "${task.title.substring(0, 50)}..." → "${csvTaskName.substring(0, 50)}..."`);
      updated++;
    } else if (!csvTaskName) {
      notFound++;
      // console.log(`  [NOT FOUND] Task ${task.id}: "${task.title}" (code: ${taskCode})`);
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`CSV'da topilmagan: ${notFound}`);
}

async function main() {
  try {
    await fixAllTaskTitles();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

