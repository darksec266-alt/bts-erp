// Only used by Jest, to transform the ESM-only packages otplib v13 pulls
// in (@scure/base, @noble/hashes) into CommonJS for the test runtime —
// ts-jest handles this project's own .ts files; this handles the .js files
// jest's transformIgnorePatterns override (jest.config.js) now lets through
// from node_modules.
module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
};
