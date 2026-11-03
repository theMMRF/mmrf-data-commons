// Temporary compatibility fix for @gen3/frontend 0.12.66. Its drawer header
// dereferences detailView even when the supported simpleDetailsView is used.
const fs = require('node:fs');
const path = require('node:path');

const original = 'config.detailView.showSubmitButton';
const replacement =
  '(config.detailView?.showSubmitButton ?? config.simpleDetailsView?.showSubmitButton ?? false)';

function patchGen3Discovery(packageRoot) {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  );
  if (version !== '0.12.66') {
    throw new Error('Reassess the Discovery compatibility patch when upgrading @gen3/frontend.');
  }

  let matched = false;
  // Patch both public entry points and both module formats; hashed bundle names
  // differ between releases. Keep their embedded source maps consistent too.
  for (const entry of fs.readdirSync(path.join(packageRoot, 'dist'), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !/\.js(?:\.map)?$/.test(entry.name)) continue;
    const filename = path.join(entry.parentPath, entry.name);
    const source = fs.readFileSync(filename, 'utf8');
    if (!source.includes(original) && !source.includes(replacement)) continue;
    matched = true;
    if (source.includes(original)) {
      fs.writeFileSync(filename, source.replaceAll(original, replacement));
    }
  }
  if (!matched) {
    throw new Error('Could not find the expected Gen3 Discovery drawer code.');
  }
}

if (require.main === module) {
  patchGen3Discovery(path.resolve(__dirname, '../node_modules/@gen3/frontend'));
}

module.exports = { patchGen3Discovery };
