import { defineConfig } from "vite";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { version } from "./package.json";

// Dev-server proxy targets, overridable via an untracked vite.proxy.local.js
// (see vite.proxy.local.example.js).
const defaultProxy = {
    "/api": "http://127.0.0.1:8090",
    "/_": "http://127.0.0.1:8090",
};

async function resolveProxy() {
    const localProxyPath = path.resolve(__dirname, "vite.proxy.local.js");
    if (!fs.existsSync(localProxyPath)) {
        return defaultProxy;
    }
    // Vite bundles this config with rolldown before running it, and a
    // literal "./vite.proxy.local.js" specifier gets resolved at that
    // bundle step - unconditionally, ignoring the existsSync guard above -
    // which fails the whole config load for anyone without their own
    // local override file. Importing a file:// URL built from a variable
    // isn't statically resolvable, so the bundler leaves it as a runtime
    // import() and the guard above actually gates it.
    const { proxy } = await import(pathToFileURL(localProxyPath).href);
    return proxy ?? defaultProxy;
}

// https://vite.dev/config/
export default defineConfig(async () => ({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src/"),
        },
    },
    server: {
        proxy: await resolveProxy(),
    },
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "vendor",
                            test: /node_modules/,
                            priority: 10,
                        },
                    ],
                },
            },
        },
    },
    plugins: [react(), tailwindcss()],
    define: {
        "import.meta.env.PACKAGE_VERSION": JSON.stringify(version),
    },
}));
