module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "max-len": ["error", { "code": 120 }],
    "object-curly-spacing": ["error", "always"],
    "indent": ["error", 2],
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
  },
};
