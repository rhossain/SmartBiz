/* ESLint config — TypeScript strict + React hooks, no warnings weakening the gate.
 *
 * U1 (u1-skeleton) adds three structural rules, each a blocking lint error:
 *   - BR7.1: browser files never import server-only modules (postgres, argon2, node:*,
 *     process, and value imports of db/client, auth/argon2, observability/log, server/**);
 *     type-only imports stay allowed.
 *   - BR7.4: the shared kernel (src/data/**) imports no feature module, and feature screens
 *     import no other feature, the router, the API client or server code.
 *   - team.md Testing Posture: no argument-less `new Date()` or `Date.now()` in src outside
 *     src/data/clock.ts, where every live "now" goes.
 * ESLint overrides replace a rule's options rather than merging them, so each override
 * below restates the full option list for the files it matches.
 */

/* ------------------------------------------------------------------ restricted syntax */
const NO_RAW_NOW = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: "Use now() from src/data/clock.ts; argument-less new Date() is banned in src (team.md).",
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: "Use now() from src/data/clock.ts; Date.now() is banned in src (team.md).",
  },
];

// NFR5.4 / NFR5.3 (B2): SmartBiz has no card payments, so no card, CVV, PAN or
// bank-account identifier may be introduced in the orders unit. Blocks the names at edit
// time; the grep test tests/unit/pci-deny-list-orders.test.ts covers strings and comments.
const PCI_DENY_LIST = {
  selector: "Identifier[name=/^(card|cvv|pan|cardNumber|bankAccount|accountNumber)$/]",
  message:
    "PCI scope: do not introduce card / cvv / pan / cardNumber / bankAccount / accountNumber identifiers in src/orders/ (NFR5.4).",
};

/* ------------------------------------------------------------------ restricted imports */
const SERVER_ONLY_MESSAGE = "Server-only code must not reach the browser bundle (BR7.1).";

const BROWSER_PATHS = [
  { name: "postgres", message: SERVER_ONLY_MESSAGE },
  { name: "argon2", message: SERVER_ONLY_MESSAGE },
];

const BROWSER_PATTERNS = [
  { group: ["node:*"], message: SERVER_ONLY_MESSAGE },
  {
    group: ["**/db/client*", "**/auth/argon2*", "**/observability/log*", "**/server/**"],
    allowTypeImports: true,
    message: `${SERVER_ONLY_MESSAGE} Use \`import type\` for types.`,
  },
];

const SCREEN_PATTERNS = [
  {
    group: [
      "**/auth/*",
      "**/orders/*",
      "**/router/*",
      "**/client/*",
      "**/server/*",
      "**/db/*",
      "**/audit/*",
      "**/observability/*",
    ],
    allowTypeImports: true,
    message:
      "A feature screen imports no other feature, the router or the API client; receive data and callbacks as props (BR7.4).",
  },
];

const KERNEL_PATTERNS = [
  {
    group: [
      "../auth/*",
      "../orders/*",
      "../router/*",
      "../client/*",
      "../server/*",
      "../pres/*",
      "../db/*",
      "../audit/*",
      "../observability/*",
      "../i18n/*",
    ],
    message: "The shared kernel (src/data/**) imports no feature module (BR7.4).",
  },
];

const BROWSER_FILES = [
  "src/index.tsx",
  "src/pres/**",
  "src/router/**",
  "src/i18n/**",
  "src/client/**",
  "src/**/screens/**",
];

module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "18.3" } },
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
    "no-var": "error",
  },
  overrides: [
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      rules: { "no-restricted-syntax": ["error", ...NO_RAW_NOW] },
    },
    {
      files: ["src/orders/**/*.ts", "src/orders/**/*.tsx"],
      rules: { "no-restricted-syntax": ["error", ...NO_RAW_NOW, PCI_DENY_LIST] },
    },
    {
      // The one place a live "now" may be read.
      files: ["src/data/clock.ts"],
      rules: { "no-restricted-syntax": "off" },
    },
    {
      files: ["src/data/**"],
      rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: KERNEL_PATTERNS }] },
    },
    {
      files: BROWSER_FILES,
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          { paths: BROWSER_PATHS, patterns: BROWSER_PATTERNS },
        ],
        "no-restricted-globals": [
          "error",
          { name: "process", message: SERVER_ONLY_MESSAGE },
          { name: "Bun", message: SERVER_ONLY_MESSAGE },
        ],
      },
    },
    {
      files: ["src/**/screens/**"],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          { paths: BROWSER_PATHS, patterns: [...BROWSER_PATTERNS, ...SCREEN_PATTERNS] },
        ],
      },
    },
  ],
  ignorePatterns: [
    "dist",
    "node_modules",
    "coverage",
    "*.cjs",
    "prototype/**",
    "_bmad/**",
    "_bmad-output/**",
    ".claude/**",
    "aidlc/**",
    ".codex-presentation-build/**",
    ".ci-artifacts/**",
  ],
};
