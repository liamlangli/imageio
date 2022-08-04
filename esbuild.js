const { build } = require("esbuild")

build({
    bundle: true,
    entryPoints: [
        "example/env/index.ts",
        "example/qoi/index.ts",
        "example/worker/env.worker.ts",
    ],
    treeShaking: true,
    sourcemap: true,
    incremental: true,
    outdir: "public/lib",
    watch: {
        onRebuild(error, result) {
            if (error) console.error('watch build failed:', error)
            else console.log('watch build succeeded:', result)
        }
    }
}).catch(() => process.exit(1))