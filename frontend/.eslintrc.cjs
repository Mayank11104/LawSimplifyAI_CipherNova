module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended', // ✅ Prettier + ESLint integration
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // ✅ Not needed in React 17+
    'no-unused-vars': 'warn', // ✅ Warn but don’t break build
    'react/prop-types': 'off', // ✅ Disable if you’re using TS
    'jsx-a11y/anchor-is-valid': 'warn', // ✅ Accessibility: warn instead of error
  },
};
