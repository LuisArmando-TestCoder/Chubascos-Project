const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf-8');
content.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1]] = val.replace(/\\n/g, '\n');
  }
});
require('child_process').execSync('npx tsx src/scripts/test-notifications.ts', { stdio: 'inherit' });
