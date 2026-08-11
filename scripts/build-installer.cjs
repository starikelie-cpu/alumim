const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, (pkg.build && pkg.build.directories && pkg.build.directories.output) || 'build-output');
const installerName = 'Nihul Beit Cnecet Setup 1.4.21.exe';
const tempOutDir = path.join(root, 'build-output-temp');
const electronBuilderBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
const packagesToRemove = [
  path.join(root, 'node_modules', 'antd'),
  path.join(root, 'node_modules', '@ant-design'),
];

function removeIfExists(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

for (const target of [outDir, tempOutDir, path.join(outDir, 'win-unpacked'), path.join(outDir, 'win-unpacked.tmp')]) {
  removeIfExists(target);
}

for (const target of packagesToRemove) {
  removeIfExists(target);
}

const args = process.platform === 'win32'
  ? ['/c', electronBuilderBin, '--win', '--x64']
  : [electronBuilderBin, '--win', '--x64'];

console.log('Running electron-builder with fallback script...');
execFileSync(process.platform === 'win32' ? 'cmd.exe' : electronBuilderBin, args, { cwd: root, stdio: 'inherit' });
