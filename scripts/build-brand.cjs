// Raster exports are rendered directly from the production SVG geometry.
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const root = resolve(__dirname, '..');
const brand = JSON.parse(readFileSync(resolve(root, '_data/brand.json'), 'utf8'));
const out = resolve(root, 'images');
mkdirSync(resolve(out, 'brand'), { recursive: true });
const mark = (small = false, color = brand.blue) => `<path fill="${color}" transform="${brand.transform}" d="${small ? brand.small_path : brand.path}"/>`;
const svg = (content, label = 'heroding77') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${label}">${content}</svg>\n`;
const icon = (small = false, maskable = false) => svg(`<rect width="128" height="128" rx="${maskable ? 0 : 25}" fill="${brand.paper}"/>${maskable ? `<g transform="translate(22 22) scale(.65625)">${mark(small)}</g>` : `<g transform="translate(9 9) scale(.859375)">${mark(small)}</g>`}`);
writeFileSync(resolve(out, 'brand/heroding77-mark.svg'), svg(mark()));
writeFileSync(resolve(out, 'brand/heroding77-mark-mono.svg'), svg(mark(false, brand.dark)));
writeFileSync(resolve(out, 'brand/heroding77-mark-on-dark.svg'), svg(mark(false, '#9aafff')));
writeFileSync(resolve(out, 'brand/favicon.svg'), icon(true));
const render = (source, size) => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
const rasterExports = [
  ['favicon-16x16.png', 16], ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180], ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512], ['maskable-512x512.png', 512, true],
];
for (const [name, size, maskable] of rasterExports) writeFileSync(resolve(out, name), render(icon(size <= 32, maskable), size));
// PNG-compressed ICO directory: each size is rendered independently, never upscaled.
const sizes = [16, 32, 48, 64];
const pngs = sizes.map(size => render(icon(size <= 32), size));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const at = 6 + index * 16;
  header[at] = header[at + 1] = size;
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(pngs[index].length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += pngs[index].length;
});
const ico = Buffer.concat([header, ...pngs]);
writeFileSync(resolve(out, 'favicon.ico'), ico);
writeFileSync(resolve(root, 'favicon.ico'), ico);
console.log('Exported the dual-77 SVG mark, favicon, touch, Android and maskable icons.');
