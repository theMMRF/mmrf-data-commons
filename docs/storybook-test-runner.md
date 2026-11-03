# Storybook test-runner compatibility

The npm overrides keep the Jest 30 package family on compatible versions below
30.5.0. Storybook 10.5.10 loads `.storybook/test-runner.ts` using `module.register()`,
which Jest 30.5 rejects inside its test sandbox. This fails before any story runs.
See [Storybook issue #36116](https://github.com/storybookjs/storybook/issues/36116).

Pinning only `jest` is insufficient because the runner and other test dependencies
also resolve Jest packages independently. The overrides apply only to Jest 30;
older major versions used by other tooling are unaffected.

Remove these overrides together after upgrading to a Storybook/test-runner
combination that passes the story tests with Jest 30.5 or newer, including the
accessibility hooks in `.storybook/test-runner.ts`.
