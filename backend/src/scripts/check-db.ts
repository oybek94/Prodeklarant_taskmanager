import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const tableInfo: any[] = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Training' AND column_name = 'requiresExam';
    `;
    
    if (tableInfo.length > 0) {
      console.log('Column "requiresExam" exists:', tableInfo[0]);
    } else {
      console.log('Column "requiresExam" DOES NOT exist in table "Training".');
    }

    const trainingCount = await prisma.training.count();
    console.log('Total trainings:', trainingCount);

    if (trainingCount > 0) {
        const firstTraining = await prisma.training.findFirst();
        console.log('First training sample:', firstTraining);
    }

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
