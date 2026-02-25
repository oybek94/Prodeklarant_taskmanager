const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hash = await bcrypt.hash('4444', 10);

    await prisma.user.update({
        where: { id: 5 }, // Oybek
        data: { passwordHash: hash }
    });

    console.log('Oybek password updated to 4444');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
