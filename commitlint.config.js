const fs = require('fs');

/*
 * Type-Enums and their documentation as reusable const.
 */
const typeEnumDescription = {
  fix: {
    description: 'A code change that fixes an error or bug',
    title: 'Fix',
    emoji: '💉',
  },
  feat: {
    description: 'Adding new functionality',
    title: 'Feature',
    emoji: '🐣',
  },
  docs: {
    description: 'Documentation only changes',
    title: 'Documentation',
    emoji: '📜',
  },
  format: {
    description:
      'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
    title: 'Formatting',
    emoji: '💎',
  },
  refactor: {
    description: 'A code change that neither fixes a bug nor adds a feature',
    title: 'Code Refactoring',
    emoji: '♻',
  },
  perf: {
    description: 'A code change that improves performance',
    title: 'Performance Improvements',
    emoji: '🚀',
  },
  deprecate: {
    description:
      'A code change that deprecates APIs or is related to their deprecation',
    title: 'Code Deprecations',
    emoji: '🕸',
  },
  test: {
    description: 'Adding missing tests or correcting existing tests',
    title: 'Tests',
    emoji: '🛂',
  },
  build: {
    description:
      'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
    title: 'Builds',
    emoji: '📦',
  },
  ci: {
    description:
      'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
    title: 'Continuous Integrations',
    emoji: '🏭',
  },
  ops: {
    description:
      'Changes to our CI / CD configuration files and scripts (example scopes: GH Actions, Heroku, Docker...)',
    title: 'DevOps',
    emoji: '🏭',
  },
  chore: {
    description: "Other changes that don't modify src or test files",
    title: 'Chores',
    emoji: '⚙',
  },
  revert: {
    description: 'Reverts a previous commit',
    title: 'Reverts',
    emoji: '🗑',
  },
};

/*
 * Scope-Enums defined from constants and Nx projects.
 */
const baseScopes = ['release'];

const scopeEnum = () => {
  const packagesNames = fs
    .readdirSync('packages', { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);

  return [...baseScopes, ...packagesNames];
};

const Configuration = {
  /*
   * Resolve and load @commitlint/config-conventional from node_modules.
   * Referenced packages must be installed
   */
  extends: ['@commitlint/config-conventional'],
  /*
   * Override rules from @commitlint/config-conventional
   */
  rules: {
    /*
     * Customized types matching CU folders
     */
    'type-enum': [2, 'always', Object.keys(typeEnumDescription)],
    /*
     * Scope enums derived from projects registered in `workspace.json`
     */
    'scope-enum': [2, 'always', scopeEnum()],
  },
};

module.exports = Configuration;
