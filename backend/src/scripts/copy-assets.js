const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'assets');
const destDir = path.join(__dirname, '..', '..', 'dist', 'assets');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    try {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      console.log(`Copied ${file} to dist/assets/`);
    } catch (err) {
      console.error(`Error copying ${file}:`, err.message);
    }
  }
} else {
  console.log('No assets directory found in src/, skipping copy.');
}
