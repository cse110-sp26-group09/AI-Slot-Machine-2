/**
 * @fileoverview Build configuration for candidate assets.
 * @typedef {import("esbuild").BuildOptions} BuildOptions
 */

import fs from "node:fs/promises";
import path from "node:path";
import { build, transform } from "esbuild";

const projectRoot = process.cwd();
const clientRoot = path.join(projectRoot, "client");
const buildRoot = path.join(projectRoot, "build");

const cssFiles = ["variables.css", "layout.css", "components.css", "animations.css"];

const ensureBuildStructure = async () => {
  await fs.rm(buildRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(buildRoot, "js"), { recursive: true });
  await fs.mkdir(path.join(buildRoot, "css"), { recursive: true });
};

const buildJs = async () =>
  build({
    entryPoints: [path.join(clientRoot, "js", "main.js")],
    outfile: path.join(buildRoot, "js", "main.js"),
    bundle: true,
    minify: true,
    minifyIdentifiers: true,
    minifyWhitespace: true,
    minifySyntax: true,
    treeShaking: true,
    legalComments: "none",
    format: "esm",
    target: "es2022",
    charset: "ascii",
  });

const buildCss = async () => {
  await Promise.all(
    cssFiles.map(async (fileName) => {
      const source = await fs.readFile(path.join(clientRoot, "css", fileName), "utf8");
      const transformed = await transform(source, { loader: "css", minify: true });
      await fs.writeFile(path.join(buildRoot, "css", fileName), transformed.code, "utf8");
    })
  );
};

const buildHtml = async () => {
  const html = await fs.readFile(path.join(clientRoot, "index.html"), "utf8");
  await fs.writeFile(path.join(buildRoot, "index.html"), html, "utf8");
};

const run = async () => {
  await ensureBuildStructure();
  await buildJs();
  await buildCss();
  await buildHtml();
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
