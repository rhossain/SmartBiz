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
  overrides: [
    {
      // NFR5.4 / NFR5.3 (B2): SmartBiz has no card payments, so no card,
      // CVV, PAN or bank-account identifier may be introduced in the
      // orders unit. Blocks the names at edit time; the grep test
      // tests/unit/pci-deny-list-orders.test.ts covers strings and comments.
      files: ["src/orders/**/*.ts", "src/orders/**/*.tsx"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector: "Identifier[name=/^(card|cvv|pan|cardNumber|bankAccount|accountNumber)$/]",
            message:
              "PCI scope: do not introduce card / cvv / pan / cardNumber / bankAccount / accountNumber identifiers in src/orders/ (NFR5.4).",
          },
        ],
      },
    },
  ],
  ignorePatterns: ["dist", "node_modules", "coverage", "*.cjs", "prototype/**", "_bmad/**", "_bmad-output/**", ".claude/**", "aidlc/**"],
};
