import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const rootDir = process.cwd();
const buildDir = path.join(rootDir, "build");
const buildJsDir = path.join(buildDir, "js");
const buildCssDir = path.join(buildDir, "css");

await mkdir(buildJsDir, { recursive: true });
await mkdir(buildCssDir, { recursive: true });

await build({
  entryPoints: [path.join(rootDir, "client/js/main.js")],
  outfile: path.join(buildJsDir, "main.js"),
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  minifySyntax: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  legalComments: "none",
  charset: "utf8"
});

await cp(path.join(rootDir, "client/css"), buildCssDir, { recursive: true });

const sourceHtml = await readFile(path.join(rootDir, "client/index.html"), "utf8");
const buildHtml = sourceHtml.replace(
  /<script type="module" src="\/js\/main\.js"><\/script>/,
  '<script type="module" src="/js/main.js"></script>'
);
await writeFile(path.join(buildDir, "index.html"), buildHtml, "utf8");
