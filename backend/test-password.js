const bcrypt = require('bcryptjs');

const users = require('./users2.json');
const passwords = ['123', '1234', '12345', '123456', '12345678', 'password', 'oybek', 'Oybek', 'admin', 'admin123', '0000', '1111', '123456789'];

async function testPasswords() {
    for (const p of passwords) {
        for (const u of users) {
            const isMatch = await bcrypt.compare(p, u.passwordHash);
            if (isMatch) console.log('Match found for user:', u.name, 'Password:', p);
        }
    }
}

testPasswords();
