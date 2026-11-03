const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { patchGen3Discovery } = require('../scripts/patch-gen3-discovery.cjs');

test('Gen3 drawer supports simple and tabbed configurations after installation', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gen3-discovery-patch-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '0.12.66' }));
  const bundle = 'config.detailView.showSubmitButton';
  const files = ['index/esm/index-hash.js', 'index/cjs/index-hash.js',
    'pages/esm/index-hash.js', 'pages/cjs/index-hash.js'];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, 'dist', file)), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist', file), bundle);
  }
  const sourceMap = path.join(root, 'dist', `${files[0]}.map`);
  fs.writeFileSync(sourceMap, JSON.stringify({ sourcesContent: [bundle] }));
  assert.throws(() => vm.runInNewContext(bundle, { config: { simpleDetailsView: {} } }));

  patchGen3Discovery(root);
  patchGen3Discovery(root); // npm install/prune can run postinstall more than once.

  for (const file of files) {
    const patched = fs.readFileSync(path.join(root, 'dist', file), 'utf8');
    for (const [config, expected] of [
      [{ simpleDetailsView: {} }, false],
      [{ simpleDetailsView: { showSubmitButton: true } }, true],
      [{ detailView: { showSubmitButton: false }, simpleDetailsView: { showSubmitButton: true } }, false],
      [{ detailView: { showSubmitButton: true } }, true],
    ]) {
      assert.equal(vm.runInNewContext(patched, { config }), expected);
    }
  }
  assert.equal(JSON.parse(fs.readFileSync(sourceMap, 'utf8')).sourcesContent[0],
    fs.readFileSync(path.join(root, 'dist', files[0]), 'utf8'));
});

test('dependency upgrades require reassessing the compatibility patch', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gen3-discovery-version-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '0.12.67' }));
  assert.throws(() => patchGen3Discovery(root), /Reassess/);
});
