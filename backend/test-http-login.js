async function login(password) {
    try {
        const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok) {
            console.log('Success for password:', password, data.user);
        } else {
            console.error('Error for password:', password, data.error);
        }
    } catch (e) {
        console.error('Fetch error:', password, e.message);
    }
}

async function main() {
    await login('4444');
    await login('1111');
}

main();
