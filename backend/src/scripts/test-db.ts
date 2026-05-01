import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Bu scriptni backend papkasidan ishga tushiramiz, shuning uchun .env yo'lini to'g'rilaymiz
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testConnection() {
  console.log('Ulanish URL:', process.env.READ_ONLY_DATABASE_URL);
  const client = new Client({ connectionString: process.env.READ_ONLY_DATABASE_URL });
  try {
    await client.connect();
    console.log('Ulandi!');
    
    // Task jadvalidan so'rov qilib ko'ramiz
    const res = await client.query('SELECT "id" FROM "Task" LIMIT 1;');
    console.log('Natija:', res.rows);
  } catch (err: any) {
    console.error('XATO:', err.message);
  } finally {
    await client.end();
  }
}
testConnection();
