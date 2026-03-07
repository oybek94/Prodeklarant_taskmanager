const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSellerRole() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE 'SELLER'`);
        console.log('Role SELLER added to database successfully!');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('Role SELLER already exists in the database.');
        } else {
            console.error('Error adding role SELLER:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

addSellerRole();
