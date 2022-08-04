const { build } = require("esbuild")
const { exec } = require('child_process');

exec('rm -rf asset/public');
build({
    treeShaking: true,
    bundle: true,
    minify: true,
    entryPoints: [
        "example/env/index.ts",
        "example/qoi/index.ts",
        "example/worker/env.worker.ts",
    ],
    outdir: "public/lib",
}).catch(() => process.exit(1))