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
  const serverTaskMap = new Map<string, { id: number; title: string; clientName: string }>();
  existingTasks.forEach(t => {
    const key = `${t.title}|${t.client.name}`;
    serverTaskMap.set(key, { id: t.id, title: t.title, clientName: t.client.name });
  });
  
  const missingInServer: any[] = [];
  const foundTaskIds = new Set<number>();
  
  for (const taskData of importData.tasks) {
    const key = `${taskData.title}|${taskData.clientName}`;
    const serverTask = serverTaskMap.get(key);
    
    if (serverTask) {
      foundTaskIds.add(serverTask.id);
    } else {
      missingInServer.push(taskData);
    }
  }
  
  if (missingInServer.length > 0) {
    console.log(`\n=== Server'da yo'q task'lar (${missingInServer.length} ta) ===`);
    missingInServer.forEach((t, i) => {
      console.log(`\n${i + 1}. "${t.title}"`);
      console.log(`   Client: ${t.clientName}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Created: ${t.createdAt}`);
    });
  } else {
    console.log(`\n[INFO] Barcha task'lar server'da topildi!`);
  }
  
  // Duplicate task'larni topish
  const taskKeyCount = new Map<string, number>();
  importData.tasks.forEach((t: any) => {
    const key = `${t.title}|${t.clientName}`;
    taskKeyCount.set(key, (taskKeyCount.get(key) || 0) + 1);
  });
  
  const duplicates: any[] = [];
  taskKeyCount.forEach((count, key) => {
    if (count > 1) {
      const [title, clientName] = key.split('|');
      duplicates.push({ title, clientName, count });
    }
  });
  
  if (duplicates.length > 0) {
    console.log(`\n=== Duplicate task'lar (${duplicates.length} ta) ===`);
    duplicates.forEach((d, i) => {
      console.log(`\n${i + 1}. "${d.title}"`);
      console.log(`   Client: ${d.clientName}`);
      console.log(`   Takrorlanish: ${d.count} marta`);
    });
  }
  
  console.log(`\n=== Xulosa ===`);
  console.log(`Import fayldagi task'lar: ${importData.tasks.length}`);
  console.log(`Server'dagi task'lar: ${existingTasks.length}`);
  console.log(`Topilgan unique task'lar: ${foundTaskIds.size}`);
  console.log(`Server'da yo'q task'lar: ${missingInServer.length}`);
  console.log(`Duplicate task'lar: ${duplicates.length}`);
  console.log(`Unique task'lar: ${importData.tasks.length - duplicates.reduce((sum, d) => sum + (d.count - 1), 0)}`);
  
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

