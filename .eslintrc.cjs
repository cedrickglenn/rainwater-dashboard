module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "prettier",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y", "import"],
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      alias: {
        map: [["~", "./app"]],
        extensions: [".js", ".jsx", ".json"],
      },
      node: {
        extensions: [".js", ".jsx"],
      },
    },
  },
  rules: {
    // React rules
    "react/prop-types": "off",
    "react/jsx-no-target-blank": "warn",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",

    // Import rules
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/no-unresolved": "off",

    // General rules
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "no-console": "warn",
  },
  ignorePatterns: [
    "node_modules",
    "build",
    "public/build",
    ".cache",
    "*.config.js",
  ],
};
