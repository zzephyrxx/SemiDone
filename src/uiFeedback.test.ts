import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = new URL('.', import.meta.url).pathname.replace(/^\/(.:\/)/, '$1');

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(path);
    if (!['.ts', '.tsx'].includes(extname(entry.name)) || entry.name.includes('.test.')) return [];
    return [path];
  });
}

describe('operation feedback policy', () => {
  it('does not show success or cancellation confirmation popups', () => {
    const violations = productionSourceFiles(SOURCE_ROOT).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      if (/toast\.success\s*\(|toast\.info\s*\(\s*['"`]已取消/.test(source)) {
        return [file.replace(SOURCE_ROOT, '')];
      }
      return [];
    });

    expect(violations).toEqual([]);
  });
});
