const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'node_modules', 'antd');

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
} else {
  console.log(`No Ant Design package found at ${target}`);
}
