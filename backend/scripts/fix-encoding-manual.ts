import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

async function fixEncodingManual() {
  // CSV fayl yo'li
  const csvPath = 'c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv';
  const buffer = fs.readFileSync(csvPath);
  const fileContent = iconv.decode(buffer, 'win1251');
  
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  const taskNameIdx = headers.findIndex(h => h.includes('Task Name'));
  
  // CSV'dan barcha task'larni o'qish (raqam + kod bo'yicha)
  const csvTasksByNumber = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const taskName = values[taskNameIdx]?.trim();
    if (!taskName) continue;
    
    // Task raqamini olish (birinchi qism)
    const taskNumber = taskName.split(/\s+/)[0];
    csvTasksByNumber.set(taskNumber, taskName);
  }
  
  console.log(`CSV'dan ${csvTasksByNumber.size} ta task topildi\n`);
  
  // Muammoli task'lar
  const problematicTasks = [
    { id: 72, number: '30' },
    { id: 73, number: '31' },
    { id: 79, number: '37' },
    { id: 34, number: '24' },
    { id: 85, number: '43' },
    { id: 71, number: '29' },
    { id: 28, number: '19' },
    { id: 60, number: '19' },
    { id: 65, number: '24' },
    { id: 109, number: '37' },
    { id: 127, number: '43' },
  ];
  
  let updated = 0;
  
  for (const { id, number } of problematicTasks) {
    const csvTaskName = csvTasksByNumber.get(number);
    
    if (csvTaskName) {
      const task = await prisma.task.findUnique({
        where: { id },
        select: { title: true },
      });
      
      if (task && task.title !== csvTaskName) {
        await prisma.task.update({
          where: { id },
          data: { title: csvTaskName },
        });
        
        console.log(`  [UPDATED] Task ${id}: "${task.title.substring(0, 50)}..." → "${csvTaskName.substring(0, 50)}..."`);
        updated++;
      }
    } else {
      console.log(`  [NOT FOUND] Task ${id}: raqam ${number} CSV'da topilmadi`);
    }
  }
  
  console.log(`\nYangilangan: ${updated}`);
}

fixEncodingManual()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

