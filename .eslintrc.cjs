/* ESLint config — TypeScript strict + React hooks, no warnings weakening the gate. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "18.2" } },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "no-console": ["error", { allow: ["warn", "error"] }],
  },
  ignorePatterns: ["dist", "node_modules", "coverage", "*.cjs", "prototype/**", "_bmad/**", "_bmad-output/**", ".claude/**"],
};
