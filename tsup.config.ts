import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/server.ts"],
    format: ["esm"], //keep this as ESM
    target: "esnext",
    outDir: "dist",
    clean: true,
    bundle: true,
    splitting: false,
    sourcemap: true,
    //add this banner to shim require() for CJS dependencies
    banner: {
        js: `
        import {createRequire} from 'module';
        const require = createRequire(import.meta.url);
        `,
    },
});