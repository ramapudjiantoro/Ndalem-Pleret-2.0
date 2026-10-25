import { build as esbuild } from "esbuild";
import { rm, stat } from "fs/promises";

// Bundle fungsi API jadi satu file CommonJS (api.cjs). esbuild membaca alias @shared/* dari tsconfig.
async function buildFunction() {
  await rm("netlify/functions", { recursive: true, force: true });

  console.log("building netlify function...");
  await esbuild({
    entryPoints: ["netlify/src/api.ts"],
    platform: "node",
    target: "node22",
    bundle: true,
    format: "cjs",
    // .cjs: package.json project ini "type": "module", jadi .js akan dibaca sebagai ESM
    outfile: "netlify/functions/api.cjs",
    minify: true,
    external: ["pg-native"], // dependensi opsional pg — tidak dipakai
    logLevel: "info",
  });

  const { size } = await stat("netlify/functions/api.cjs");
  console.log(`netlify/functions/api.cjs = ${(size / 1024 / 1024).toFixed(2)} MiB`);
}

buildFunction().catch((err) => {
  console.error(err);
  process.exit(1);
});
