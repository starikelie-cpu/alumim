const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outputDir = path.join(root, (pkg.build && pkg.build.directories && pkg.build.directories.output) || 'build-output');
const targets = [
  outputDir,
  path.join(outputDir, 'win-unpacked'),
  path.join(outputDir, 'win-unpacked.tmp'),
];

function removeTarget(target) {
  if (!fs.existsSync(target)) return;

  const normalized = target.replace(/\//g, '\\');

  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${path.relative(root, target) || '.'}`);
    return;
  } catch (error) {
    console.warn(`rmSync failed for ${target}; trying Windows fallback`);
  }

  for (const [command, args] of [
    ['cmd.exe', ['/c', `if exist "${normalized}" rmdir /s /q "${normalized}"`]],
    ['powershell.exe', ['-NoProfile', '-Command', `if (Test-Path '${normalized}') { Remove-Item -LiteralPath '${normalized}' -Recurse -Force -ErrorAction SilentlyContinue }`]],
  ]) {
    try {
      execFileSync(command, args, { stdio: 'inherit' });
      if (!fs.existsSync(target)) {
        console.log(`Removed ${path.relative(root, target) || '.'} via ${command}`);
        return;
      }
    } catch (error) {
      console.warn(`Fallback cleanup via ${command} failed: ${error.message}`);
    }
  }

  console.warn(`Cleanup incomplete for ${target}; continuing`);
}

for (const target of targets) {
  removeTarget(target);
}

fs.mkdirSync(outputDir, { recursive: true });
console.log(`Created ${path.relative(root, outputDir) || '.'}`);
