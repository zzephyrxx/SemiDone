import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

describe('transparent mode text contrast', () => {
  it('raises muted text contrast only while transparent mode is active', () => {
    expect(stylesheet).toContain('--transparent-muted-foreground: 214 32% 82%');
    expect(stylesheet).toMatch(/body\.transparent-mode\s*\{[^}]*--muted-foreground:\s*var\(--transparent-muted-foreground\)/s);
  });

  it('covers legacy gray utility text and form placeholders', () => {
    expect(stylesheet).toContain('body.transparent-mode .text-gray-500');
    expect(stylesheet).toContain('body.transparent-mode .text-gray-700');
    expect(stylesheet).toContain('body.transparent-mode input::placeholder');
    expect(stylesheet).toContain('body.transparent-mode textarea::placeholder');
  });
});
