module.exports = {
  env: {
    browser: false, // Changed to false since this is Node.js backend
    es2020: true, // More specific than es6
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "commonjs", // Changed from "module" since you're using require/exports
  },
  extends: [
    "eslint:recommended",
    "google", // Use the Google config you have installed
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    semi: ["error", "always"],
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
    "max-len": ["error", { code: 100, ignoreUrls: true }], // Google style guide
    indent: ["error", 2], // 2-space indentation
    "new-cap": [
      "error",
      {
        capIsNewExceptions: ["IDL"], // Allow IDL constructors
        properties: false,
      },
    ],
    "valid-jsdoc": [
      "error",
      {
        requireReturn: false, // Don't require @return for all functions
        requireParamDescription: false, // Don't require param descriptions
      },
    ],
    "require-jsdoc": [
      "error",
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: false,
          ClassDeclaration: false,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.spec.*", "**/*.test.*"],
      env: {
        mocha: true,
      },
      rules: {
        "no-unused-expressions": "off", // Allow chai expressions
      },
    },
  ],
  globals: {
    // Firebase Functions globals
    functions: "readonly",
  },
};
