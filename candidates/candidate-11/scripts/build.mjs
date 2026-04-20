import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(projectRoot, "client");
const buildRoot = path.join(projectRoot, "build");

const cssFiles = ["variables.css", "layout.css", "animations.css", "components.css"];

const minifyCss = (source) => {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .trim();
};

const ensureCleanBuildDirectory = async () => {
  await fs.rm(buildRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(buildRoot, "css"), { recursive: true });
  await fs.mkdir(path.join(buildRoot, "js"), { recursive: true });
};

const copyAndMinifyCss = async () => {
  for (const cssFile of cssFiles) {
    const sourcePath = path.join(clientRoot, "css", cssFile);
    const destinationPath = path.join(buildRoot, "css", cssFile);
    const source = await fs.readFile(sourcePath, "utf8");
    await fs.writeFile(destinationPath, minifyCss(source), "utf8");
  }
};

const copyHtml = async () => {
  const sourcePath = path.join(clientRoot, "index.html");
  const destinationPath = path.join(buildRoot, "index.html");
  const source = await fs.readFile(sourcePath, "utf8");
  await fs.writeFile(destinationPath, source, "utf8");
};

const buildClientJs = async () => {
  await esbuild.build({
    entryPoints: [path.join(clientRoot, "js", "main.js")],
    bundle: true,
    minify: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
    legalComments: "none",
    format: "esm",
    target: ["es2020"],
    outfile: path.join(buildRoot, "js", "main.js")
  });
};

await ensureCleanBuildDirectory();
await Promise.all([copyAndMinifyCss(), buildClientJs(), copyHtml()]);
