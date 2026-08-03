// Tightened ESLint flat configuration for AlgoVault Express Backend
export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
    },
  },
  {
    files: [
      'src/jobs/**/*.js',
      'src/utils/seed.js',
      'src/utils/test*.js',
      'src/utils/mailer.js',
      'src/server.js',
      'src/config/db.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];
