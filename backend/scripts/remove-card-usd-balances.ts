import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('CARD-USD balanslarini o\'chirish...');
  
  const deleted = await prisma.accountBalance.deleteMany({
    where: {
      type: 'CARD',
      currency: 'USD',
    },
  });

  console.log(`${deleted.count} ta CARD-USD balans o'chirildi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


