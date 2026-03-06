import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.exam.updateMany({
        where: {
            lesson: {
                title: '_AI_STAGE_EXAM'
            }
        },
        data: {
            trainingId: null
        }
    });
    console.log(`Updated ${result.count} AI exams to remove trainingId.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
