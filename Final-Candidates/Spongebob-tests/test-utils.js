"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");

function createWindow(windowOverrides) {
  const overrides = windowOverrides || {};
  const windowObject = {
    SlotApp: {},
    performance: performance,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    requestAnimationFrame: function (callback) {
      return setTimeout(function () {
        callback(performance.now());
      }, 16);
    },
    cancelAnimationFrame: function (timerId) {
      clearTimeout(timerId);
    },
    crypto: undefined,
    Math: Math,
    ...overrides
  };

  if (!windowObject.performance) {
    windowObject.performance = performance;
  }
  if (!windowObject.setTimeout) {
    windowObject.setTimeout = setTimeout;
  }
  if (!windowObject.clearTimeout) {
    windowObject.clearTimeout = clearTimeout;
  }
  if (!windowObject.Math) {
    windowObject.Math = Math;
  }

  return windowObject;
}

function loadScripts(scriptPaths, options) {
  const config = options || {};
  const windowObject = createWindow(config.windowOverrides);

  const context = vm.createContext({
    window: windowObject,
    Math: windowObject.Math,
    Date: Date,
    Promise: Promise,
    Uint32Array: Uint32Array,
    setTimeout: windowObject.setTimeout,
    clearTimeout: windowObject.clearTimeout,
    performance: windowObject.performance,
    console: console
  });

  scriptPaths.forEach(function (relativePath) {
    const absolutePath = path.resolve(__dirname, "..", relativePath);
    const source = fs.readFileSync(absolutePath, "utf8");
    vm.runInContext(source, context, { filename: absolutePath });
  });

  return windowObject;
}

function createSequenceMath(sequence) {
  const values = sequence.slice();
  const sequenceMath = Object.create(Math);

  sequenceMath.random = function () {
    if (!values.length) {
      return 0;
    }
    return values.shift();
  };

  return sequenceMath;
}

module.exports = {
  loadScripts: loadScripts,
  createSequenceMath: createSequenceMath
};

