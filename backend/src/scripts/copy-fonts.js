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
    try {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied ${file} to dist/fonts/`);
    } catch (err) {
      console.error(`Error copying ${file}:`, err.message);
      console.log(`Source exists: ${fs.existsSync(srcFile)}`);
      console.log(`Dest dir exists: ${fs.existsSync(destDir)}`);
    }
  }
} else {
  console.log('No fonts directory found in src/, skipping copy.');
}
