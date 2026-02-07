/// <reference types="node" />
import { PrismaClient, ProcessType, Role } from '@prisma/client';
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

  // Seed default ProcessSettings (estimatedTime, reminder1, reminder2, reminder3 in minutes)
  await Promise.all([
    prisma.processSettings.upsert({
      where: { processType: ProcessType.TIR },
      update: {},
      create: { processType: ProcessType.TIR, estimatedTime: 30, reminder1: 10, reminder2: 20, reminder3: 40 },
    }),
    prisma.processSettings.upsert({
      where: { processType: ProcessType.CERT },
      update: {},
      create: { processType: ProcessType.CERT, estimatedTime: 30, reminder1: 10, reminder2: 20, reminder3: 40 },
    }),
    prisma.processSettings.upsert({
      where: { processType: ProcessType.DECLARATION },
      update: {},
      create: { processType: ProcessType.DECLARATION, estimatedTime: 30, reminder1: 10, reminder2: 20, reminder3: 40 },
    }),
  ]);

  console.log('Seed done', { admin: admin.email, branches: [branchT.name, branchO.name] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

