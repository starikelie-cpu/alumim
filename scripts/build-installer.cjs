const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, (pkg.build && pkg.build.directories && pkg.build.directories.output) || 'build-output');
const installerName = `Nihul Beit Cnecet Setup ${pkg.version}.exe`;
const tempOutDir = path.join(root, 'build-output-temp');
const electronBuilderBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');

// Packages to temporarily remove before pack (they are bundled in vite dist, not needed as node_modules)
const packagesToRemove = [
  path.join(root, 'node_modules', 'antd'),
  path.join(root, 'node_modules', '@ant-design'),
];

function removeIfExists(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

// Clean old build output dirs
for (const target of [outDir, tempOutDir, path.join(outDir, 'win-unpacked'), path.join(outDir, 'win-unpacked.tmp')]) {
  removeIfExists(target);
}

// Temporarily remove large frontend-only packages so electron-builder doesn't include them
console.log('Temporarily removing frontend-only packages from node_modules...');
for (const target of packagesToRemove) {
  removeIfExists(target);
}

let buildError = null;
try {
  const args = process.platform === 'win32'
    ? ['/c', electronBuilderBin, '--win', '--x64']
    : [electronBuilderBin, '--win', '--x64'];

  console.log('Running electron-builder...');
  execFileSync(process.platform === 'win32' ? 'cmd.exe' : electronBuilderBin, args, { cwd: root, stdio: 'inherit' });
} catch (err) {
  buildError = err;
}

// Restore removed packages so next build works
console.log('Restoring node_modules (npm install)...');
execFileSync('npm', ['install', '--prefer-offline'], { cwd: root, stdio: 'inherit', shell: true });

if (buildError) {
  console.error('electron-builder failed:', buildError.message);
  process.exit(1);
}

console.log(`Build complete: ${installerName}`);
