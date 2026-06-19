const securityPlugin = require('eslint-plugin-security');

module.exports = [
  {
    ignores: ['coverage/**'],
  },
  {
    files: ['**/*.js'],
    plugins: {
      security: securityPlugin,
    },
    rules: {
      ...securityPlugin.configs.recommended.rules,
    },
  },
];