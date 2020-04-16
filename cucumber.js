module.exports = {
  default: [
    'cucumber/features/**/*.feature', // Specify our feature files
    '--require-module ts-node/register', // Load TypeScript module
    '--require cucumber/step-definitions/**/*.ts', // Load step definitions
    '--format progress-bar', // Load custom formatter
    '--format node_modules/cucumber-pretty', // Load custom formatter
  ].join(' '),
};
