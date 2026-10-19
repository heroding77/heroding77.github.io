const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const versions = {};
for (const [key, file] of Object.entries({ css: 'assets/css/portfolio.css', js: 'assets/js/portfolio.js' })) {
  versions[key] = createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex').slice(0, 12);
}
writeFileSync(resolve(root, '_data/assets.json'), JSON.stringify(versions, null, 2) + '\n');
console.log('Updated asset fingerprints.');
