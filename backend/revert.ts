import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function revert() {
  const tenMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const recentMedals = await prisma.userMedal.findMany({
    where: { awardedAt: { gte: tenMinutesAgo } }
  });

  if (recentMedals.length === 0) {
    console.log('No recent medals found.');
    return;
  }

  console.log('Reverting medals:', recentMedals);

  for (const medal of recentMedals) {
    await prisma.userMedal.delete({ where: { id: medal.id } });
    
    await prisma.user.update({
      where: { id: medal.userId },
      data: { xp: { decrement: medal.xpBonus } }
    });
  }

  await prisma.notification.deleteMany({
    where: { 
      createdAt: { gte: tenMinutesAgo },
      title: { in: ['Yangi Medal!', 'Taqdirlash!'] }
    }
  });

  console.log('Reverted successfully!');
}
revert().catch(console.error).finally(() => prisma.$disconnect());
