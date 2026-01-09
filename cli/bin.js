#!/usr/bin/env node
const path = require("path");

const projectRoot = __dirname;

require("ts-node").register({
  project: path.join(projectRoot, "tsconfig.json"),
  cwd: projectRoot,
});

require("./src/main");
