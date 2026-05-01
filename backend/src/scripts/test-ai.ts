import path from 'path';
import dotenv from 'dotenv';
// MUST load dotenv BEFORE importing anything that uses process.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { DataAssistantService } from '../services/data-assistant.service';

async function main() {
  const service = new DataAssistantService();
  try {
    const res = await service.askQuestion('Eng ko\'p ishni kim bajardi?');
    console.log('Javob:', res);
  } catch (e) {
    console.error('Xato:', e);
  }
}
main();
