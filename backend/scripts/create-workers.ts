/**
 * Local database'ga kerakli worker user'larni yaratish
 * 
 * Foydalanish:
 *   cd backend
 *   npx ts-node --transpile-only scripts/create-workers.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/hash';

const prisma = new PrismaClient();

const workers = [
  { name: 'Oybek', role: Role.MANAGER },
  { name: 'Ahadbek', role: Role.MANAGER },
  { name: 'Hakimjon', role: Role.MANAGER },
  { name: 'Abdukamol', role: Role.MANAGER },
];

async function createWorkers() {
  console.log('Worker userlarni yaratish...\n');
  
  // Avval branch'larni topish
  const branchT = await prisma.branch.findFirst({ where: { name: 'Toshkent' } });
  const branchO = await prisma.branch.findFirst({ where: { name: 'Oltiariq' } });
  
  if (!branchT || !branchO) {
    console.error('Branch\'lar topilmadi. Avval seed skriptini ishga tushiring: npm run prisma:seed');
    process.exit(1);
  }
  
  let created = 0;
  let existing = 0;
  
  for (const worker of workers) {
    // User allaqachon borligini tekshirish
    const existingUser = await prisma.user.findFirst({
      where: { name: worker.name },
    });
    
    if (existingUser) {
      console.log(`[SKIP] ${worker.name} allaqachon mavjud (ID: ${existingUser.id})`);
      existing++;
      continue;
    }
    
    // Email yaratish
    const email = `${worker.name.toLowerCase().replace(/\s+/g, '')}@local.test`;
    
    // Parol: default "worker123" (keyinroq o'zgartirish mumkin)
    const passwordHash = await hashPassword('worker123');
    
    // Branch'ni tanlash (Toshkent yoki Oltiariq)
    const branchId = worker.name === 'Oybek' || worker.name === 'Ahadbek' ? branchT.id : branchO.id;
    
    try {
      const user = await prisma.user.create({
        data: {
          name: worker.name,
          email: email,
          passwordHash: passwordHash,
          role: worker.role,
          branchId: branchId,
        },
      });
      
      console.log(`[OK] ${worker.name} yaratildi (ID: ${user.id}, Email: ${email}, Branch: ${branchId === branchT.id ? 'Toshkent' : 'Oltiariq'})`);
      created++;
    } catch (error: any) {
      console.error(`[ERROR] ${worker.name} yaratishda xatolik: ${error.message}`);
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yaratildi: ${created}`);
  console.log(`Mavjud: ${existing}`);
  console.log(`Jami: ${workers.length}`);
  console.log(`\nParol: worker123 (barcha user'lar uchun)`);
}

async function main() {
  try {
    await createWorkers();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

