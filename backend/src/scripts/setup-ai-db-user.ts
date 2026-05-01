import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function createAiUser() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Bazaga ulandi...');

    // CREATE USER may fail if it already exists, so we ignore error if it's already there
    try {
      await client.query("CREATE USER ai_assistant WITH PASSWORD 'TasodifiyParol123';");
      console.log('ai_assistant foydalanuvchisi yaratildi.');
    } catch (e: any) {
      if (e.code === '42710') { // 42710 is duplicate_object
        console.log('ai_assistant foydalanuvchisi allaqachon mavjud.');
      } else {
        throw e;
      }
    }

    await client.query('GRANT CONNECT ON DATABASE prodeklarant TO ai_assistant;');
    await client.query('GRANT USAGE ON SCHEMA public TO ai_assistant;');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_assistant;');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_assistant;');

    console.log('Muvaffaqiyatli! Read-only ruxsatlar berildi.');
  } catch (err) {
    console.error('Xatolik yuz berdi:', err);
  } finally {
    await client.end();
  }
}

createAiUser();
