import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import { pocketbaseGlobals } from "./eslint.pocketbase-globals.js";

const readonly = (names) =>
    Object.fromEntries(names.map((name) => [name, "readonly"]));

export default defineConfig([
    // pb_migrations is append-only history: each file records a schema change
    // that has already been applied, and PocketBase generates most of them.
    // Editing one to satisfy a linter risks changing what a past migration
    // did, so they are left alone.
    globalIgnores(["dist", "releases", "pb/pb_data", "pb/pb_migrations"]),
    {
        // Baseline for everything we lint. Globals are left to the per-runtime
        // blocks below, since this repo spans three different runtimes.
        files: ["**/*.{js,jsx}"],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2020,
            parserOptions: {
                ecmaVersion: "latest",
                ecmaFeatures: { jsx: true },
                sourceType: "module",
            },
        },
        rules: {
            // An unused catch binding is normal here: plenty of places only
            // care that an operation failed, not why. Unused arguments opt out
            // by name, so a callback can still document its full signature.
            "no-unused-vars": [
                "error",
                {
                    varsIgnorePattern: "^[A-Z_]",
                    argsIgnorePattern: "^_",
                    caughtErrors: "none",
                },
            ],
        },
    },
    {
        // The React client, bundled by Vite and run in the browser.
        files: ["src/**/*.{js,jsx}"],
        extends: [
            reactHooks.configs.flat["recommended-latest"],
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        // Hooks run inside PocketBase's own Go-hosted JS runtime: no browser,
        // no Node, but a large set of PocketBase globals plus a CommonJS-style
        // require(). Plain scripts, not ES modules.
        files: ["pb/**/*.js"],
        languageOptions: {
            sourceType: "script",
            globals: {
                ...readonly(pocketbaseGlobals),
                console: "readonly",
                require: "readonly",
                module: "writable",
            },
        },
    },
    {
        // Build and release tooling, the Vite/ESLint configs, and the MCP
        // server all run under Node, not the browser.
        files: ["scripts/**/*.js", "mcp/**/*.js", "*.config.js"],
        languageOptions: {
            globals: globals.node,
        },
    },
]);
