import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

describe('desktop interaction guards', () => {
  it('disables selection globally while preserving text editing controls', () => {
    expect(stylesheet).toMatch(/#root \*\s*\{[^}]*user-select:\s*none\s*!important/s);
    expect(stylesheet).toMatch(/#root input,[\s\S]*?#root textarea,[\s\S]*?user-select:\s*text\s*!important/s);
  });

  it('prevents WebView-native dragging for images, icons, and links', () => {
    expect(stylesheet).toMatch(/#root img,[\s\S]*?#root svg,[\s\S]*?#root a\s*\{[^}]*-webkit-user-drag:\s*none/s);
  });
});
