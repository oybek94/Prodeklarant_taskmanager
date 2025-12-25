/**
 * Import jarayonida qaysi task'lar topilmayotganini aniqlash
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function debugImport() {
  console.log('Import jarayonida qaysi task\'lar topilmayotganini aniqlash...\n');
  
  const importPath = path.join(__dirname, '../../tasks-export.json');
  
  if (!fs.existsSync(importPath)) {
    console.error(`Import fayl topilmadi: ${importPath}`);
    process.exit(1);
  }
  
  const importData = JSON.parse(fs.readFileSync(importPath, 'utf-8'));
  console.log(`Import fayldan ${importData.tasks.length} ta task topildi\n`);
  
  // Server'dagi barcha task'larni olish
  const existingTasks = await prisma.task.findMany({
    include: {
      client: { select: { name: true } },
    },
  });
  
  console.log(`Server'da ${existingTasks.length} ta task mavjud\n`);
  
  // Client cache
  const clientCache = new Map<string, number>();
  const clients = await prisma.client.findMany();
  clients.forEach(c => clientCache.set(c.name, c.id));
  
  const notFound: Array<{
    title: string;
    clientName: string;
    taskCode: string | null;
    reason: string;
  }> = [];
  
  const foundByTitle: number[] = [];
  const foundByCode: number[] = [];
  const foundByCaseInsensitive: number[] = [];
  
  // Har bir import task'ni tekshirish
  for (const taskData of importData.tasks) {
    const clientId = clientCache.get(taskData.clientName);
    if (!clientId) {
      notFound.push({
        title: taskData.title,
        clientName: taskData.clientName,
        taskCode: null,
        reason: 'Client topilmadi',
      });
      continue;
    }
    
    // 1. To'liq title va clientId bo'yicha qidirish
    let task = await prisma.task.findFirst({
      where: {
        title: taskData.title,
        clientId: clientId,
      },
    });
    
    if (task) {
      foundByTitle.push(task.id);
      continue;
    }
    
    // 2. Task code bo'yicha qidirish
    const titleParts = taskData.title.split(/\s+/);
    const taskCode = titleParts.find(p => /^[0-9A-Z]{6,}$/.test(p));
    
    if (taskCode) {
      const allClientTasks = await prisma.task.findMany({
        where: { clientId: clientId },
        include: { client: { select: { name: true } } },
      });
      
      task = allClientTasks.find(t => {
        const tParts = t.title.split(/\s+/);
        return tParts.some(p => p === taskCode);
      }) || null;
      
      if (task) {
        foundByCode.push(task.id);
        continue;
      }
    }
    
    // 3. Case-insensitive qidirish
    task = await prisma.task.findFirst({
      where: {
        title: { equals: taskData.title, mode: 'insensitive' },
        clientId: clientId,
      },
    });
    
    if (task) {
      foundByCaseInsensitive.push(task.id);
      continue;
    }
    
    // Topilmadi
    notFound.push({
      title: taskData.title,
      clientName: taskData.clientName,
      taskCode: taskCode || null,
      reason: 'Hech qanday usul bilan topilmadi',
    });
  }
  
  // Unique found task IDs
  const allFoundIds = new Set([...foundByTitle, ...foundByCode, ...foundByCaseInsensitive]);
  
  console.log('=== Natijalar ===');
  console.log(`Jami import task'lar: ${importData.tasks.length}`);
  console.log(`Topilgan (title): ${foundByTitle.length}`);
  console.log(`Topilgan (code): ${foundByCode.length}`);
  console.log(`Topilgan (case-insensitive): ${foundByCaseInsensitive.length}`);
  console.log(`Unique topilgan task'lar: ${allFoundIds.size}`);
  console.log(`Topilmagan: ${notFound.length}`);
  console.log(`\nServer'dagi task'lar soni: ${existingTasks.length}`);
  console.log(`Import fayldagi task'lar soni: ${importData.tasks.length}`);
  console.log(`Farq: ${importData.tasks.length - existingTasks.length} ta task server'da yo'q`);
  
  // Import fayldagi barcha task'larni server'dagi task'lar bilan solishtirish
  const importTaskKeys = new Set(
    importData.tasks.map((t: any) => `${t.title}|${t.clientName}`)
  );
  const serverTaskKeys = new Set(
    existingTasks.map(t => `${t.title}|${t.client.name}`)
  );
  
  const missingInServer: any[] = [];
  for (const taskData of importData.tasks) {
    const key = `${taskData.title}|${taskData.clientName}`;
    if (!serverTaskKeys.has(key)) {
      missingInServer.push(taskData);
    }
  }
  
  if (missingInServer.length > 0) {
    console.log(`\n=== Server'da yo'q task'lar (${missingInServer.length} ta) ===`);
    missingInServer.forEach((t, i) => {
      console.log(`\n${i + 1}. "${t.title}"`);
      console.log(`   Client: ${t.clientName}`);
    });
  }
  
  if (notFound.length > 0) {
    console.log(`\n=== Topilmagan task'lar (${notFound.length} ta) ===`);
    notFound.forEach((t, i) => {
      console.log(`\n${i + 1}. "${t.title}"`);
      console.log(`   Client: ${t.clientName}`);
      console.log(`   Code: ${t.taskCode || 'N/A'}`);
      console.log(`   Sabab: ${t.reason}`);
    });
    
    // Server'dagi shu client'ga tegishli task'larni ko'rsatish
    console.log(`\n=== Server'dagi shu client'lardagi task'lar ===`);
    const uniqueClients = [...new Set(notFound.map(t => t.clientName))];
    for (const clientName of uniqueClients) {
      const clientId = clientCache.get(clientName);
      if (clientId) {
        const clientTasks = await prisma.task.findMany({
          where: { clientId: clientId },
          select: { id: true, title: true },
        });
        console.log(`\n${clientName} (${clientTasks.length} ta task):`);
        clientTasks.slice(0, 5).forEach(t => {
          console.log(`  - Task ${t.id}: "${t.title.substring(0, 50)}..."`);
        });
        if (clientTasks.length > 5) {
          console.log(`  ... va yana ${clientTasks.length - 5} ta task`);
        }
      }
    }
  }
  
  await prisma.$disconnect();
}

debugImport().catch((e) => {
  console.error(e);
  process.exit(1);
});

