/**
 * Barcha task nomlarini to'g'ri encoding bilan yangilash (to'liq versiya)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

async function fixAllEncoding() {
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
  const csvTasksByCode = new Map<string, { taskName: string; clientName: string }>();
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const taskName = values[taskNameIdx]?.trim();
    const clientName = values[clientNameIdx]?.trim();
    
    if (!taskName || !clientName) continue;
    
    // Task code'ni ajratib olish (uzun raqam+harf kombinatsiyasi)
    const taskCode = taskName.split(/\s+/).find(p => /^[0-9A-Z]{6,}$/.test(p));
    if (taskCode) {
      csvTasksByCode.set(taskCode, { taskName, clientName });
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
  let alreadyCorrect = 0;
  
  // Har bir task'ni yangilash
  for (const task of allTasks) {
    const titleParts = task.title.split(/\s+/).filter(p => p.trim());
    
    // Task code'ni topish (uzun raqam+harf kombinatsiyasi)
    const taskCode = titleParts.find(p => /^[0-9A-Z]{6,}$/.test(p));
    
    if (!taskCode) {
      // Task code topilmadi - bu task'ni o'tkazib yuboramiz
      continue;
    }
    
    const csvTask = csvTasksByCode.get(taskCode);
    
    if (csvTask) {
      // Client nomi ham mos kelishi kerak
      if (csvTask.clientName === task.client.name) {
        if (task.title !== csvTask.taskName) {
          await prisma.task.update({
            where: { id: task.id },
            data: { title: csvTask.taskName },
          });
          
          console.log(`  [UPDATED] Task ${task.id}: "${task.title.substring(0, 50)}..." → "${csvTask.taskName.substring(0, 50)}..."`);
          updated++;
        } else {
          alreadyCorrect++;
        }
      } else {
        // Client nomi mos kelmayapti, lekin code mos kelsa ham yangilaymiz
        if (task.title !== csvTask.taskName) {
          await prisma.task.update({
            where: { id: task.id },
            data: { title: csvTask.taskName },
          });
          
          console.log(`  [UPDATED] Task ${task.id} (client mismatch): "${task.title.substring(0, 50)}..." → "${csvTask.taskName.substring(0, 50)}..."`);
          updated++;
        }
      }
    } else {
      notFound++;
      // console.log(`  [NOT FOUND] Task ${task.id}: "${task.title}" (code: ${taskCode})`);
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`Allaqachon to'g'ri: ${alreadyCorrect}`);
  console.log(`CSV'da topilmagan: ${notFound}`);
  
  // Encoding muammosini tekshirish
  const problematicTasks = await prisma.task.findMany({
    where: {
      OR: [
        { title: { contains: '' } },
        { title: { contains: '' } },
      ],
    },
    select: {
      id: true,
      title: true,
    },
  });
  
  console.log(`\nEncoding muammosi bo'lgan task'lar: ${problematicTasks.length}`);
  if (problematicTasks.length > 0) {
    console.log('Muammoli task\'lar:');
    problematicTasks.forEach(task => {
      console.log(`  Task ${task.id}: "${task.title}"`);
    });
  }
}

async function main() {
  try {
    await fixAllEncoding();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

