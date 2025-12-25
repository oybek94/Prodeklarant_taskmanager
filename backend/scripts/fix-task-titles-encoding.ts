/**
 * Task nomlaridagi encoding muammosini tuzatish
 * CSV fayldan qayta o'qib, to'g'ri encoding bilan task nomlarini yangilash
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

async function fixTaskTitles() {
  console.log('Task nomlaridagi encoding muammosini tuzatish...\n');
  
  // CSV fayl yo'li
  const csvPath = 'c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV fayl topilmadi: ${csvPath}`);
    process.exit(1);
  }
  
  // CSV faylni to'g'ri encoding bilan o'qish (windows-1251 -> utf-8)
  let fileContent: string;
  
  try {
    // Buffer sifatida o'qish
    const buffer = fs.readFileSync(csvPath);
    
    // Avval windows-1251 bilan decode qilish
    fileContent = iconv.decode(buffer, 'win1251');
    console.log(`Fayl encoding: windows-1251 (iconv-lite)`);
    
    // Test: kirillcha belgilar to'g'ri o'qilganini tekshirish
    if (fileContent.includes('') || !fileContent.includes('82')) {
      // Agar hali ham muammo bo'lsa, utf-8 bilan urinib ko'ramiz
      fileContent = buffer.toString('utf-8');
      console.log(`Fayl encoding: utf-8 (fallback)`);
    }
  } catch (e) {
    // Agar xatolik bo'lsa, oddiy utf-8 bilan urinib ko'ramiz
    try {
      fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' as BufferEncoding });
      console.log(`Fayl encoding: utf-8`);
    } catch (e2) {
      console.error("CSV fayl encoding'ini aniqlab bo'lmadi:", e2);
      process.exit(1);
    }
  }
  
  // CSV'ni manual parse qilish
  const lines = fileContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    console.error('CSV fayl bo\'sh');
    process.exit(1);
  }
  
  // Header'ni olish
  const headers = lines[0].split(';').map(h => h.trim());
  const records: any[] = [];
  
  // Qatorlarni parse qilish
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const record: any = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim() || '';
    });
    if (record['Task ID'] && record['Task Name']) {
      records.push(record);
    }
  }
  
  console.log(`Jami ${records.length} ta qator topildi\n`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  // Har bir task'ni yangilash
  for (const row of records) {
    const taskId = row['Task ID'];
    const taskName = row['Task Name'];
    const clientName = row['Klient'];
    
    if (!taskId || !taskName) {
      continue;
    }
    
    try {
      // Client'ni topish
      const client = await prisma.client.findFirst({
        where: { name: clientName },
      });
      
      if (!client) {
        console.warn(`  [SKIP] Client topilmadi: ${clientName} (Task ID: ${taskId})`);
        notFound++;
        continue;
      }
      
      // Task'ni topish - title'da task nomidagi raqam qismi bor bo'lsa
      const allTasks = await prisma.task.findMany({
        where: {
          clientId: client.id,
        },
        select: {
          id: true,
          title: true,
        },
      });
      
      // Task nomidan raqam qismini ajratib olish (masalan: "82 АВТО 40M825QB" -> "82" va "40M825QB")
      const taskNameParts = taskName.split(/\s+/).filter(p => p.trim());
      const taskNumber = taskNameParts[0]; // Birinchi qism (masalan: "82")
      // Kod qismini topish (uzun raqam+harf kombinatsiyasi)
      const taskCode = taskNameParts.find(p => /^[0-9A-Z]{6,}$/.test(p)); // Kod qismi (masalan: "40M825QB")
      
      // Task'ni topish - title'da raqam yoki kod qismi bor bo'lsa
      const foundTask = allTasks.find(t => {
        const titleParts = t.title.split(/\s+/).filter(p => p.trim());
        
        // Task number qismini tekshirish (birinchi qism)
        if (taskNumber && titleParts.length > 0 && titleParts[0] === taskNumber) {
          return true;
        }
        
        // Task code qismini tekshirish (uzun kod)
        if (taskCode) {
          const foundCode = titleParts.find(part => part === taskCode || part.includes(taskCode));
          if (foundCode) {
            return true;
          }
        }
        
        // Task ID qismini tekshirish (agar mavjud bo'lsa)
        if (taskId && taskId.length > 5) {
          return false; // Task ID UUID bo'lsa, ishlatmaymiz
        }
        
        return false;
      });
      
      if (foundTask) {
        // Task title'ni yangilash (faqat agar o'zgargan bo'lsa)
        if (foundTask.title !== taskName) {
          await prisma.task.update({
            where: { id: foundTask.id },
            data: { title: taskName },
          });
          
          console.log(`  [UPDATED] Task ${foundTask.id}: "${foundTask.title.substring(0, 50)}..." → "${taskName.substring(0, 50)}..."`);
          updated++;
        } else {
          // console.log(`  [SKIP] Task ${foundTask.id} allaqachon to'g'ri`);
        }
      } else {
        console.warn(`  [NOT FOUND] Task topilmadi: ${taskId} (${taskName.substring(0, 30)})`);
        notFound++;
      }
    } catch (error: any) {
      console.error(`  [ERROR] Task ${taskId}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`Topilmagan: ${notFound}`);
  console.log(`Xatolar: ${errors}`);
}

async function main() {
  try {
    await fixTaskTitles();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

