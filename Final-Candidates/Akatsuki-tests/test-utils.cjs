"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");

function candidatePath(relativePath) {
  return path.resolve(__dirname, "candidate-16", relativePath);
}

async function importCandidateModule(relativePath) {
  const absolutePath = candidatePath(relativePath);
  const moduleUrl = `${pathToFileURL(absolutePath).href}?v=${process.hrtime.bigint()}`;
  return import(moduleUrl);
}

async function withMockedRandom(sequence, callback) {
  const originalRandom = Math.random;
  const values = Array.isArray(sequence) ? sequence.slice() : [];

  Math.random = function () {
    if (!values.length) {
      return 0;
    }
    return values.shift();
  };

  try {
    return await callback();
  } finally {
    Math.random = originalRandom;
  }
}

function createImmediateWindow(overrides) {
  const custom = overrides || {};
  return {
    setTimeout(callback) {
      callback();
      return 0;
    },
    clearTimeout() {},
    confirm() {
      return true;
    },
    ...custom,
  };
}

async function withMockedWindow(windowOverrides, callback) {
  const originalWindow = global.window;
  global.window = createImmediateWindow(windowOverrides);

  try {
    return await callback();
  } finally {
    if (typeof originalWindow === "undefined") {
      delete global.window;
    } else {
      global.window = originalWindow;
    }
  }
}

module.exports = {
  importCandidateModule,
  withMockedRandom,
  withMockedWindow,
};

