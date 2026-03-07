/// <reference types="node" />
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/hash';

const prisma = new PrismaClient();

async function main() {
  const branchT = await prisma.branch.upsert({
    where: { name: 'Toshkent' },
    update: {},
    create: { name: 'Toshkent' },
  });
  const branchO = await prisma.branch.upsert({
    where: { name: 'Oltiariq' },
    update: {},
    create: { name: 'Oltiariq' },
  });

  const adminEmail = 'admin@local.test';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin',
      email: adminEmail,
      passwordHash: await hashPassword('admin123'),
      role: Role.ADMIN,
      branchId: branchT.id,
    },
  });

  // Seed KPI configs for all stages default price 0
  const stageNames = [
    'Invoys',
    'Zayavka',
    'TIR-SMR',
    'ST',
    'Fito',
    'Deklaratsiya',
    'Tekshirish',
    'Topshirish',
    'Pochta',
    'Sho‘pirga xat yuborish',
  ];
  await Promise.all(
    stageNames.map((name) =>
      prisma.kpiConfig.upsert({
        where: { stageName: name },
        update: {},
        create: { stageName: name, price: 0 },
      })
    )
  );

  // Seed LMS levels
  const levelNames = ['Level 1', 'Level 2', 'Level 3'];
  const levels = await Promise.all(
    levelNames.map((name, idx) =>
      prisma.lmsLevel.upsert({
        where: { orderIndex: idx + 1 },
        update: {},
        create: { name, orderIndex: idx + 1 },
      })
    )
  );

  // Ensure admin has an LMS profile
  await prisma.lmsUserProfile.upsert({
    where: { userId: admin.id },
    update: { role: 'ADMIN', currentLevelId: levels[0].id },
    create: { userId: admin.id, role: 'ADMIN', currentLevelId: levels[0].id },
  });

  console.log('Seed done', { admin: admin.email, branches: [branchT.name, branchO.name], lmsLevels: levels.map(l => ({ id: l.id, name: l.name })) });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

