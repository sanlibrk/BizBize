import { writeFile } from 'node:fs/promises';
import { privacySections, termsSections, POLICY_VERSION, PRIVACY_VERSION } from '../src/content/policies.ts';
for (const [file, title, sections] of [['PRIVACY.md', 'Gizlilik politikası', privacySections], ['TERMS.md', 'Kullanım koşulları', termsSections]]) {
  await writeFile(new URL(`../docs/${file}`, import.meta.url), `# Biz Bize · ${title}\n\nSon güncelleme: ${file === 'PRIVACY.md' ? PRIVACY_VERSION : POLICY_VERSION}\n\n` + sections.map(([heading, body]) => `## ${heading}\n\n${body}\n`).join('\n'));
}
