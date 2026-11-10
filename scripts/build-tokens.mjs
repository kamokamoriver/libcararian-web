// design-system/tokens.json から src/styles/tokens.css を作る。
// 使い方: npm run tokens（トークンを変えたときだけ実行し、生成物はコミットする）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '..', 'design-system', 'tokens.json');
const t = JSON.parse(readFileSync(src, 'utf-8'));

const light = [];
const dark = [];
for (const c of t.color.tokens) {
  light.push(`  --${c.name}: ${c.value.light};`);
  dark.push(`  --${c.name}: ${c.value.dark};`);
}
const common = [`  --font-sans: ${t.type.families.sans};`];
for (const g of t.type.groups) {
  for (const s of g.styles) {
    common.push(`  --text-${s.name}: ${s.fontWeight} ${s.fontSize}/${s.lineHeight} var(--font-sans);`);
  }
}
for (const s of t.spacing.tokens) common.push(`  --${s.name}: ${s.value};`);
for (const r of t.radius.tokens) common.push(`  --${r.name}: ${r.value};`);
for (const s of t.shadow.tokens) common.push(`  --${s.name}: ${s.value};`);
// tokens.json の usage に「ダークでは 0 1px 4px rgba(0, 0, 0, .6)」とある
dark.push('  --sheet-shadow: 0 1px 4px rgba(0, 0, 0, .6);');

const css = `/* 自動生成: scripts/build-tokens.mjs（元: design-system/tokens.json）。直接編集しない */
:root {
${common.join('\n')}
${light.join('\n')}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark.map((l) => '  ' + l).join('\n')}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${dark.join('\n')}
  color-scheme: dark;
}
`;
mkdirSync(join(root, 'src', 'styles'), { recursive: true });
writeFileSync(join(root, 'src', 'styles', 'tokens.css'), css);
console.log('wrote src/styles/tokens.css');
