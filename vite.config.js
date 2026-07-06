import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { version } from "./package.json";

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src/"),
        },
    },
    server: {
        proxy: {
            "/api": "http://127.0.0.1:8090",
            "/_": "http://127.0.0.1:8090",
        },
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
});
