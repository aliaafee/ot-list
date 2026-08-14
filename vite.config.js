import { defineConfig } from "vite";
import path from "path";
import fs from "fs";
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
    if (!fs.existsSync(path.resolve(__dirname, "vite.proxy.local.js"))) {
        return defaultProxy;
    }
    const { proxy } = await import("./vite.proxy.local.js");
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
