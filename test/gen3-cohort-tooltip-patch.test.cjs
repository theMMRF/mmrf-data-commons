const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { patchGen3CohortTooltip } = require('../scripts/patch-gen3-cohort-tooltip.cjs');

test('repairs mixed tooltip bundles and source maps without duplicating disabled props', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gen3-cohort-tooltip-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '0.12.66' }));

  const label = 'A cohort saves a set of filters which generates subjects.';
  const original = `label: "${label}",`;
  const patched = `${original} disabled: true,`;
  const action = 'label: "Rename selected cohort",';
  const bundle = [patched, original, action, original].join('\n');
  const expected = [patched, patched, action, patched].join('\n');
  const files = ['index/esm/index-dIlISsbI.js', 'index/cjs/index-BvGrZnWS.js',
    'pages/esm/index-C4fuwGDz.js', 'pages/cjs/index-DU3UvuNZ.js'];
  const source = `<Tooltip label="${label}" disabled /><Tooltip label="${label}" />`;
  const expectedSource = `<Tooltip label="${label}" disabled /><Tooltip label="${label}" disabled />`;

  for (const file of files) {
    const filename = path.join(root, 'dist', file);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, bundle);
    fs.writeFileSync(`${filename}.map`, JSON.stringify({ sourcesContent: [source] }));
  }

  for (let run = 0; run < 2; run++) {
    patchGen3CohortTooltip(root);
    for (const file of files) {
      const filename = path.join(root, 'dist', file);
      assert.equal(fs.readFileSync(filename, 'utf8'), expected);
      assert.deepEqual(JSON.parse(fs.readFileSync(`${filename}.map`, 'utf8')).sourcesContent,
        [expectedSource]);
    }
  }

  // A matching source map must not hide a missing runtime tooltip match.
  fs.writeFileSync(path.join(root, 'dist', files[0]), 'unrelated runtime bundle');
  assert.throws(() => patchGen3CohortTooltip(root), /index-dIlISsbI\.js/);
  fs.rmSync(path.join(root, 'dist', files[1]));
  assert.throws(() => patchGen3CohortTooltip(root), /index-BvGrZnWS\.js/);
});
