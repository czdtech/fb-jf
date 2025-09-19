import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Prefer keeping production logs silent; allow warn/error for exceptional paths
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
];
