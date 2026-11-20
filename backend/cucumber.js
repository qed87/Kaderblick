export default {
  paths: ['features/**/*.feature'],
  import: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
  format: ['progress'],
  strict: true,
  // Features in Arbeit (@wip) laufen erst mit, wenn ihre Step-Definitionen stehen.
  tags: 'not @wip',
};
