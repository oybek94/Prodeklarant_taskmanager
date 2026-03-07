import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stage narxlari (USD)
const STAGE_PRICES: Record<string, number> = {
  'Invoys': 3.0,
  'Zayavka': 3.0,
  'TIR-SMR': 1.5,
  'Sertifikat olib chiqish': 1.25,
  'ST': 1.25, // Backward compatibility
  'Fito': 1.25, // Backward compatibility
  'FITO': 1.25, // Backward compatibility
  'Deklaratsiya': 2.0,
  'Tekshirish': 2.0,
  'Pochta': 1.0,
};

async function setStagePrices() {
  try {
    console.log('🔧 Stage narxlarini sozlash...');
    
    const results = [];
    for (const [stageName, price] of Object.entries(STAGE_PRICES)) {
      const config = await prisma.kpiConfig.upsert({
        where: { stageName },
        update: { price },
        create: { stageName, price },
      });
      results.push({ stageName, price: Number(config.price) });
      console.log(`✅ ${stageName}: $${price}`);
    }
    
    console.log(`\n✅ Barcha ${results.length} ta stage narxlari sozlandi!`);
    console.log('\n📊 Natijalar:');
    results.forEach(({ stageName, price }) => {
      console.log(`  - ${stageName}: $${price}`);
    });
  } catch (error: any) {
    console.error('❌ Xatolik:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setStagePrices()
  .then(() => {
    console.log('\n✅ Script muvaffaqiyatli yakunlandi');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script xatolik bilan yakunlandi:', error);
    process.exit(1);
  });

