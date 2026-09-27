/** @type {import('jest').Config} */
const path = require("path");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/*.test.ts"],
  passWithNoTests: false, // Phase 0 already has one real smoke test (app.test.ts) — keep this strict from day one
  // otplib v13's default plugins (@scure/base, @noble/hashes) ship ESM-only
  // and are not pre-compiled — Jest's default node_modules exclusion needs
  // an explicit carve-out for this dependency chain. babel-jest needs an
  // explicit configFile pointing at babel.config.js (one level up from
  // rootDir): the file being transformed lives in the monorepo ROOT's
  // node_modules (hoisted by npm workspaces), so babel's own upward
  // config-file search from there would never reach apps/api/ at all —
  // it's a sideways path, not an ancestor one.
  transformIgnorePatterns: ["/node_modules/(?!(@scure|@noble|@otplib|otplib)/)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": ["babel-jest", { configFile: path.resolve(__dirname, "babel.config.js") }],
  },
};
