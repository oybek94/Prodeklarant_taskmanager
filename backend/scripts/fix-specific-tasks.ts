import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

async function fixSpecificTasks() {
  // CSV fayl yo'li
  const csvPath = 'c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv';
  const buffer = fs.readFileSync(csvPath);
  const fileContent = iconv.decode(buffer, 'win1251');
  
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  const taskNameIdx = headers.findIndex(h => h.includes('Task Name'));
  
  // Muammoli task'lar: 37, 31, 43, 28, 60, 65, 34, 71, 72, 73, 79, 85, 109, 127
  const problematicTaskIds = [37, 31, 43, 28, 60, 65, 34, 71, 72, 73, 79, 85, 109, 127];
  
  // Database'dagi muammoli task'larni olish
  const problematicTasks = await prisma.task.findMany({
    where: {
      id: { in: problematicTaskIds },
    },
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
  });
  
  console.log(`Muammoli task'lar: ${problematicTasks.length}\n`);
  
  // CSV'dan barcha task'larni o'qish
  const csvTasks = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const taskName = values[taskNameIdx]?.trim();
    if (!taskName) continue;
    
    const taskCode = taskName.split(/\s+/).find(p => /^[0-9A-Z]{6,}$/.test(p));
    if (taskCode) {
      csvTasks.set(taskCode, taskName);
    }
  }
  
  let updated = 0;
  
  for (const task of problematicTasks) {
    const titleParts = task.title.split(/\s+/).filter(p => p.trim());
    const taskCode = titleParts.find(p => /^[0-9A-Z]{6,}$/.test(p));
    
    if (taskCode) {
      const csvTaskName = csvTasks.get(taskCode);
      if (csvTaskName && task.title !== csvTaskName) {
        await prisma.task.update({
          where: { id: task.id },
          data: { title: csvTaskName },
        });
        
        console.log(`  [UPDATED] Task ${task.id}: "${task.title}" → "${csvTaskName}"`);
        updated++;
      } else if (!csvTaskName) {
        console.log(`  [NOT FOUND] Task ${task.id}: "${task.title}" (code: ${taskCode})`);
      }
    } else {
      console.log(`  [NO CODE] Task ${task.id}: "${task.title}"`);
    }
  }
  
  console.log(`\nYangilangan: ${updated}`);
}

fixSpecificTasks()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

