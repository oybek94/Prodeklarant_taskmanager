import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const training = await prisma.training.findFirst();
    if (!training) {
      console.log('No training found to test.');
      return;
    }

    console.log('Current state of training:', training.id, 'requiresExam:', training.requiresExam);

    const updated = await prisma.training.update({
      where: { id: training.id },
      data: {
        requiresExam: !training.requiresExam
      }
    });

    console.log('Updated state of training:', updated.id, 'requiresExam:', updated.requiresExam);

    // Revert it
    await prisma.training.update({
      where: { id: training.id },
      data: {
        requiresExam: training.requiresExam
      }
    });
    console.log('Reverted to original state.');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
