const bcrypt = require('bcryptjs');
const users = require('./users2.json');
const passwords = ['2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '123123'];

async function test() {
    for (const p of passwords) {
        for (const u of users) {
            if (await bcrypt.compare(p, u.passwordHash)) {
                console.log(u.name, p);
            }
        }
    }
}
test();
