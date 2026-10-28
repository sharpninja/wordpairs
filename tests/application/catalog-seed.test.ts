import { createHash } from 'node:crypto';
import { existsSync,readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
import { buildCatalog,fullCaseFold,normalizeAnswer } from '../../src/domain/catalog';
import type { Pair } from '../../src/domain/model';
import data from '../../src/infrastructure/catalog-seed.json';
it('ships six categories with ten distinct directed complete pairs, three static hints and one shared background each',()=>{
  const catalog=buildCatalog(data.categories,data.pairs as Pair[]);expect(catalog.ok).toBe(true);expect(data.categories).toHaveLength(6);expect(data.pairs).toHaveLength(60);
  for(const category of data.categories){const pairs=data.pairs.filter(p=>p.categoryId===category.id);expect(pairs).toHaveLength(10);expect(new Set(pairs.map(p=>`${p.prompt}:${p.target}`)).size).toBe(10);expect(pairs.every(p=>p.backgroundId===category.backgroundId)).toBe(true);for (const aspect of ["9x16", "16x9"]) expect(existsSync(`public/backgrounds/${category.backgroundId}-${aspect}.webp`)).toBe(true);}
});
it('applies the official full default Unicode C+F mappings, including expansions, without Turkish locale folding',()=>{
  const source=readFileSync('third_party/unicode/CaseFolding-18.0.0.txt','utf8');expect(source).toContain('CaseFolding-18.0.0.txt');let checked=0;
  for(const line of source.split('\n')){const found=/^([0-9A-F]+);\s+([CF]);\s+([0-9A-F ]+);/.exec(line);if(!found)continue;const from=String.fromCodePoint(Number.parseInt(found[1],16));const expected=found[3].trim().split(/\s+/).map(n=>String.fromCodePoint(Number.parseInt(n,16))).join('');expect(fullCaseFold(from)).toBe(expected);checked++;}
  expect(checked).toBe(1606);expect(normalizeAnswer('Straße')).toBe('strasse');expect(normalizeAnswer('Σ')).toBe(normalizeAnswer('ς'));expect(normalizeAnswer('ı')).not.toBe(normalizeAnswer('I'));expect(normalizeAnswer('é')).not.toBe(normalizeAnswer('e'));expect(readFileSync('third_party/unicode/LICENSE.txt','utf8')).toContain('UNICODE LICENSE V3');
  expect(createHash('sha256').update(source).digest('hex')).toBe('a004797658a457bec4dc11683e39f69249ea3b595b752dbea6721c4c9f587b0d');
});
