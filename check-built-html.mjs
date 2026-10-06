import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8');
const references = [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
  .map((match) => match[1])
  .filter((reference) => reference !== undefined);
const externalReferences = references.filter((reference) =>
  /^(?:https?:)?\/\//i.test(reference),
);

if (externalReferences.length > 0) {
  throw new Error(`Built HTML references external origins: ${externalReferences.join(', ')}`);
}

console.info(`Checked ${references.length} built HTML asset references; all are local.`);
