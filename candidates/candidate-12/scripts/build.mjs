import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientDir = path.join(projectRoot, 'client');
const buildDir = path.join(projectRoot, 'build');
const sourceHtmlPath = path.join(clientDir, 'index.html');
const sourceCssDir = path.join(clientDir, 'css');

async function cleanBuildDirectory() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });
}

async function copyCss() {
  const files = await fs.readdir(sourceCssDir);
  const targetCssDir = path.join(buildDir, 'css');
  await fs.mkdir(targetCssDir, { recursive: true });

  await Promise.all(
    files.map(async (fileName) => {
      const fromPath = path.join(sourceCssDir, fileName);
      const toPath = path.join(targetCssDir, fileName);
      await fs.copyFile(fromPath, toPath);
    })
  );
}

async function buildJavaScript() {
  await build({
    entryPoints: [path.join(clientDir, 'js/main.js')],
    outfile: path.join(buildDir, 'app.js'),
    bundle: true,
    format: 'iife',
    minify: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    legalComments: 'none',
    target: ['es2020'],
    charset: 'ascii',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    logLevel: 'info'
  });
}

async function buildHtml() {
  const html = await fs.readFile(sourceHtmlPath, 'utf8');
  const withBundledScript = html.replace(
    '<script type="module" src="/js/main.js"></script>',
    '<script defer src="/app.js"></script>'
  );
  await fs.writeFile(path.join(buildDir, 'index.html'), withBundledScript, 'utf8');
}

async function run() {
  await cleanBuildDirectory();
  await Promise.all([copyCss(), buildJavaScript()]);
  await buildHtml();
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
