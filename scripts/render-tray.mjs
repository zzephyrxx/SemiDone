import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync(new URL('../src-tauri/icons/tray-template.svg', import.meta.url));
writeFileSync(new URL('../src-tauri/icons/tray-template.png', import.meta.url), new Resvg(svg, { fitTo: { mode: 'width', value: 44 } }).render().asPng());
