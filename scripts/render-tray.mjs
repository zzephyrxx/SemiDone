import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
// Downsample the existing raster logo for a 22pt @2x menu-bar image.
// The temporary SVG only describes the resize; the committed asset is PNG.
const logo = readFileSync(new URL('../public/Logo3D.png', import.meta.url));
const resize = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><image href="data:image/png;base64,${logo.toString('base64')}" x="2" y="2" width="40" height="40"/></svg>`;
writeFileSync(new URL('../src-tauri/icons/tray-logo.png', import.meta.url), new Resvg(resize).render().asPng());
