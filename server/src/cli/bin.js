#!/usr/bin/env node
const path = require("path");

// __dirname is the absolute path to the folder containing THIS file (bin.js)
// Example: /home/rohit/Projects/ai-cli/server/src/cli
// We go up two levels to find the 'server' root folder
const projectRoot = path.resolve(__dirname, "..", "..");

// Register ts-node with the absolute path to tsconfig.json
require("ts-node").register({
  project: path.join(projectRoot, "tsconfig.json"),
  // optional: forces ts-node to resolve modules relative to the server root
  cwd: projectRoot,
});

// Import your main file
// Because we are using require(), './main' is relative to THIS file, so it's safe.
require("./main");
