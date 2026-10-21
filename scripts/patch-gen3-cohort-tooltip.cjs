// Gen3 0.12.66's selector help tooltip sits behind the sticky navigation.
// Disable only that redundant explanation, preserving the action tooltips.
const fs = require('node:fs');
const path = require('node:path');

const label = 'A cohort saves a set of filters which generates subjects.';
const replacements = [
  [`label: "${label}",`, `label: "${label}", disabled: true,`],
  [`label="${label}"`, `label="${label}" disabled`],
];

function patchGen3CohortTooltip(packageRoot) {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  );
  if (version !== '0.12.66') {
    throw new Error('Reassess the cohort tooltip patch when upgrading @gen3/frontend.');
  }

  let matched = false;
  // Cover both entry points, CommonJS/ESM, and embedded source-map content.
  for (const entry of fs.readdirSync(path.join(packageRoot, 'dist'), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !/\.js(?:\.map)?$/.test(entry.name)) continue;
    const filename = path.join(entry.parentPath, entry.name);
    const source = fs.readFileSync(filename, 'utf8');
    const isMap = entry.name.endsWith('.map');
    let updated = source;
    for (const [original, replacement] of replacements) {
      const before = isMap ? JSON.stringify(original).slice(1, -1) : original;
      const after = isMap ? JSON.stringify(replacement).slice(1, -1) : replacement;
      if (updated.includes(after)) matched = true;
      // The replacement includes the original; leave already-patched bundles alone.
      if (!updated.includes(before) || updated.includes(after)) continue;
      matched = true;
      updated = updated.replaceAll(before, after);
    }
    if (updated !== source) fs.writeFileSync(filename, updated);
  }
  if (!matched) {
    throw new Error('Could not find the expected Gen3 cohort selector tooltip.');
  }
}

if (require.main === module) {
  patchGen3CohortTooltip(path.resolve(__dirname, '../node_modules/@gen3/frontend'));
}

module.exports = { patchGen3CohortTooltip };
