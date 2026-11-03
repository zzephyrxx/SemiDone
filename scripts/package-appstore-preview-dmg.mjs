import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function packagePreviewDmg(app) {
  const run = (file, args) => execFileSync(file, args, { stdio: 'inherit' });
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
  const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const output = resolve(root, 'release/appstore');
  mkdirSync(output, { recursive: true });
  const dmg = resolve(output, `SemiDone_${version}_appstore-preview_aarch64.dmg`);
  const staging = mkdtempSync(join(tmpdir(), 'semidone-store-preview-'));
  try {
    run('/usr/bin/ditto', [app, join(staging, '事半·SemiDone.app')]);
    symlinkSync('/Applications', join(staging, 'Applications'));
    run('/usr/bin/hdiutil', ['create', '-volname', 'SemiDone Preview', '-srcfolder', staging, '-ov', '-format', 'UDZO', dmg]);
    const hash = createHash('sha256').update(readFileSync(dmg)).digest('hex');
    writeFileSync(`${dmg}.sha256`, `${hash}  ${dmg.split('/').pop()}\n`);
    console.log(`预览版 DMG：${dmg}`);
    return dmg;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packagePreviewDmg(resolve(root, 'src-tauri/target/appstore/aarch64-apple-darwin/release/bundle/macos/事半·SemiDone.app'));
}
