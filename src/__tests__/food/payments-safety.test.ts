// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === '__tests__') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

describe('fiat payment safety', () => {
  it('has no simulated-payment path left in the app', () => {
    const offenders = walk(SRC).filter((f) => /Simulate (Successful )?Payment|generateMockReference/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('never lets the browser mark a fiat order paid', () => {
    const src = readFileSync(join(SRC, 'pages/ViewOrderDetail.tsx'), 'utf8');
    expect(src).not.toMatch(/paymentMethod:\s*"fiat"/);
    expect(src).not.toMatch(/paymentProvider/);
  });

  it('keeps provider secrets out of the client', () => {
    const offenders = walk(SRC).filter((f) => /KORAPAY_SECRET|PANDASCROW_API_KEY|api\.korapay\.com|pandascrow\.io/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
