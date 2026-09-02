/**
 * Prints the element skeleton of a design page's <main>: tag + classes, with
 * repeated siblings collapsed. Used to check the React port reproduces the
 * original structure rather than an approximation of it.
 *
 *   node scripts/skeleton.js index.html [depth]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || 'index.html';
const maxDepth = Number(process.argv[3] || 5);

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'design', file), 'utf8');
const root = parse(html);
const main = root.querySelector('main') || root;

function sig(el) {
  const cls = (el.getAttribute('class') || '').trim();
  return el.tagName.toLowerCase() + (cls ? '.' + cls.split(/\s+/).join('.') : '');
}

function walk(el, depth) {
  if (depth > maxDepth) return;
  const kids = el.childNodes.filter((n) => n.nodeType === 1);

  let i = 0;
  while (i < kids.length) {
    const s = sig(kids[i]);
    let n = 1;
    while (i + n < kids.length && sig(kids[i + n]) === s) n++;

    console.log('  '.repeat(depth) + s + (n > 1 ? `  ×${n}` : ''));
    walk(kids[i], depth + 1);
    i += n;
  }
}

console.log(`=== ${file} <main> ===`);
walk(main, 0);
