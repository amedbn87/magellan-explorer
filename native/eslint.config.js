// @ts-check
const expoConfig = require("eslint-config-expo/flat");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**", "modules/**/android/**", "modules/**/ios/**"],
  },
]);
