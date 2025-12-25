import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const csvPath = 'c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv';

// Buffer sifatida o'qish
const buffer = fs.readFileSync(csvPath);

// Windows-1251 bilan decode qilish
const content = iconv.decode(buffer, 'win1251');

// Birinchi 5 qatorni ko'rsatish
const lines = content.split('\n').slice(0, 5);
console.log('CSV fayl birinchi 5 qatori (windows-1251):');
lines.forEach((line, idx) => {
  console.log(`${idx + 1}: ${line.substring(0, 100)}`);
});

// Task Name column'ni topish
const headerLine = content.split('\n')[0];
const headers = headerLine.split(';');
const taskNameIdx = headers.findIndex(h => h.includes('Task Name'));
const taskIdIdx = headers.findIndex(h => h.includes('Task ID'));

console.log(`\nTask Name column index: ${taskNameIdx}`);
console.log(`Task ID column index: ${taskIdIdx}`);

// Bir nechta task nomini ko'rsatish
const dataLines = content.split('\n').slice(1, 6);
console.log('\nBir nechta task nomi:');
dataLines.forEach((line, idx) => {
  const values = line.split(';');
  if (values[taskNameIdx]) {
    console.log(`${idx + 1}: "${values[taskNameIdx]}"`);
  }
});

