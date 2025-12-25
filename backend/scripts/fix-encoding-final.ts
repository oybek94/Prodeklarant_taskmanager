/**
 * Barcha task nomlarini to'g'ri encoding bilan yangilash (final versiya)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

async function fixEncodingFinal() {
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
  const clientNameIdx = headers.findIndex(h => h.includes('Klient'));
  
  // CSV ma'lumotlarini map qilish (task code bo'yicha)
  const csvTasksByCode = new Map<string, string>();
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const taskName = values[taskNameIdx]?.trim();
    const clientName = values[clientNameIdx]?.trim();
    
    if (!taskName || !clientName) continue;
    
    // Task code'ni ajratib olish (uzun raqam+harf kombinatsiyasi)
    const taskCode = taskName.split(/\s+/).find(p => /^[0-9A-Z]{6,}$/.test(p));
    if (taskCode) {
      csvTasksByCode.set(taskCode, taskName);
    }
  }
  
  console.log(`CSV'dan ${csvTasksByCode.size} ta task topildi\n`);
  
  // Database'dagi barcha task'larni olish
  const allTasks = await prisma.task.findMany({
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });
  
  console.log(`Database'dan ${allTasks.length} ta task topildi\n`);
  
  let updated = 0;
  let notFound = 0;
  
  // Har bir task'ni yangilash
  for (const task of allTasks) {
    const titleParts = task.title.split(/\s+/).filter(p => p.trim());
    
    // Task code'ni topish (uzun raqam+harf kombinatsiyasi)
    const taskCode = titleParts.find(p => /^[0-9A-Z]{6,}$/.test(p));
    
    if (!taskCode) {
      // Task code topilmadi - bu task'ni o'tkazib yuboramiz
      continue;
    }
    
    const csvTaskName = csvTasksByCode.get(taskCode);
    
    if (csvTaskName) {
      // Encoding muammosini tekshirish - "" yoki "" belgilar bor bo'lsa
      const hasEncodingIssue = task.title.includes('') || task.title.includes('') || 
                               task.title.includes('') || task.title !== csvTaskName;
      
      if (hasEncodingIssue) {
        await prisma.task.update({
          where: { id: task.id },
          data: { title: csvTaskName },
        });
        
        console.log(`  [UPDATED] Task ${task.id}: "${task.title.substring(0, 50)}..." → "${csvTaskName.substring(0, 50)}..."`);
        updated++;
      }
    } else {
      notFound++;
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`CSV'da topilmagan: ${notFound}`);
  
  // Encoding muammosini tekshirish (JavaScript'da)
  const allTasksAfter = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
    },
  });
  
  const problematicTasks = allTasksAfter.filter(task => {
    return task.title.includes('') || task.title.includes('') || task.title.includes('');
  });
  
  console.log(`\nEncoding muammosi bo'lgan task'lar: ${problematicTasks.length}`);
  if (problematicTasks.length > 0) {
    console.log('Muammoli task\'lar:');
    problematicTasks.forEach(task => {
      console.log(`  Task ${task.id}: "${task.title}"`);
    });
  } else {
    console.log('Barcha task\'lar to\'g\'ri encoding bilan!');
  }
}

async function main() {
  try {
    await fixEncodingFinal();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

