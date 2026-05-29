const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'fonts');
const destDir = path.join(__dirname, '..', '..', 'dist', 'fonts');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${file} to dist/fonts/`);
  }
} else {
  console.log('No fonts directory found in src/, skipping copy.');
}
