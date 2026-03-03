const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  define: {
    __STO_AWIN_AFFILIATE_ID__: JSON.stringify(process.env.STO_AWIN_AFFILIATE_ID || ""),
    __STO_AWIN_MERCHANT_ID__: JSON.stringify(process.env.STO_AWIN_MERCHANT_ID || ""),
  },
  entryPoints: {
    "content/index": "src/content/index.ts",
    "background/service-worker": "src/background/service-worker.ts",
    "options/options": "src/options/options.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  bundle: true,
  outdir: "dist",
  target: "chrome116",
  format: "iife",
  sourcemap: isWatch, // source maps only in dev
  minify: !isWatch,
  metafile: !isWatch, // bundle analysis in production builds
  alias: {
    "@": path.resolve(__dirname, "src"),
  },
};

function copyPublicFiles() {
  const publicDir = path.resolve(__dirname, "public");
  const distDir = path.resolve(__dirname, "dist");

  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const child of fs.readdirSync(src)) {
        copyRecursive(path.join(src, child), path.join(dest, child));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(publicDir, distDir);
}

async function build() {
  copyPublicFiles();

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("👀 Watching for changes...");
  } else {
    const result = await esbuild.build(buildOptions);
    console.log("✅ Build complete");

    // Write bundle analysis
    if (result.metafile) {
      fs.writeFileSync(
        path.resolve(__dirname, "dist", "metafile.json"),
        JSON.stringify(result.metafile),
      );
      console.log(await esbuild.analyzeMetafile(result.metafile));
    }
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
