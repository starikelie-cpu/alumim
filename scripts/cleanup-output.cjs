const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'build-output', 'win-unpacked'),
  path.join(root, 'build-output', 'win-unpacked.tmp'),
];

function removeTarget(target) {
  if (!fs.existsSync(target)) return;

  const normalized = target.replace(/\//g, '\\');

  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${path.relative(root, target)}`);
    return;
  } catch (error) {
    console.warn(`rmSync failed for ${target}, falling back to Windows tools`);
  }

  const attempts = [
    ['cmd.exe', ['/c', `if exist "${normalized}" rd /s /q "${normalized}"`]],
    ['powershell.exe', ['-NoProfile', '-Command', `if (Test-Path '${normalized}') { Remove-Item -LiteralPath '${normalized}' -Recurse -Force -ErrorAction SilentlyContinue }`]],
  ];

  for (const [command, args] of attempts) {
    try {
      execFileSync(command, args, { stdio: 'inherit' });
      if (!fs.existsSync(target)) {
        console.log(`Removed ${path.relative(root, target)} via ${command}`);
        return;
      }
    } catch (error) {
      console.warn(`Cleanup attempt via ${command} failed: ${error.message}`);
    }
  }

  if (fs.existsSync(target)) {
    console.warn(`Cleanup incomplete for ${target}; continuing anyway`);
  }
}

for (const target of targets) {
  removeTarget(target);
}
