module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
  ],
  globals: {
    artifacts: 'readonly',
    contract: 'readonly',
    assert: 'readonly',
    web3: 'readonly'
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    warnOnUnsupportedTypeScriptVersion: false,
    project: [
      './tsconfig.json',
      './tsconfig.eslint.json'
    ]
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/indent': ['error', 2],
    indent: 'off', // required as 'off' by @typescript-eslint/indent
    'no-console': 'off',
    'no-restricted-syntax': 'off',
    'max-len': ['error', { code: 150 }],
    'comma-dangle': ['error', 'always-multiline'],
    'no-mixed-operators': 'off',
    'object-curly-newline': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/await-thenable': 'off', // not accurate for many web3 types
    'no-await-in-loop': 'off',
    'implicit-arrow-linebreak': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-loop-func': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'off',
    'no-empty-character-class': 'off', // causing linter to crash
    'no-regex-spaces': 'off', // causing linter to crash
  },
  settings: {
    'import/resolver': {
      typescript: {
        directory: './tsconfig.json'
      }
    }
  },
  overrides: [{
    files: ['subgraph/**/*.ts'],
    rules: {
      'prefer-const': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      'no-param-reassign': 'off'
    }
  }]
};
