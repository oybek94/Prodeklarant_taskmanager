const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const cwd = process.cwd();
const binDir = path.join(cwd, 'node_modules', '.bin');
const vitePkg = path.join(cwd, 'node_modules', 'vite', 'package.json');
const viteBinJs = path.join(cwd, 'node_modules', 'vite', 'bin', 'vite.js');
const hasBinDir = fs.existsSync(binDir);
const hasVitePkg = fs.existsSync(vitePkg);
const hasViteBinJs = fs.existsSync(viteBinJs);
let binContents = [];
if (hasBinDir) {
  try {
    binContents = fs.readdirSync(binDir);
  } catch (_) {
    binContents = ['readdir failed'];
  }
}
const pathStr = process.env.PATH || '';
const pathHasNodeModulesBin = pathStr.includes('node_modules') && pathStr.includes('.bin');

// #region agent log
fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'scripts/dev-with-debug.cjs',
    message: 'dev script env and fs checks',
    data: {
      cwd,
      hasBinDir,
      hasVitePkg,
      hasViteBinJs,
      pathHasNodeModulesBin,
      binContents: binContents.slice(0, 20),
      platform: process.platform,
    },
    hypothesisId: 'H1-H5',
    runId: 'dev-run',
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

if (hasViteBinJs) {
  const child = spawn(process.execPath, [viteBinJs], { stdio: 'inherit', cwd, env: process.env });
  child.on('close', (code) => process.exit(code != null ? code : 0));
} else {
  console.error('Vite binary not found at', viteBinJs);
  process.exit(1);
}
