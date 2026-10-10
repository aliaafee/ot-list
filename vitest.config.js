import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// The tests run in a zone well away from the hospital's, and behind UTC, so
// code that reads a stored date through the local clock gets the day before
// and fails here rather than passing on a developer's machine by accident.
// See "Time zone" in the README.
process.env.TZ = "America/Los_Angeles";

// Built on the app's own Vite config, so the "@/" alias and JSX resolve in a
// test exactly as they do in the client.
export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            projects: [
                {
                    extends: true,
                    test: {
                        name: "client",
                        environment: "node",
                        include: ["tests/client/**/*.test.js"],
                    },
                },
                {
                    // The pure functions of pb/pb_hooks, loaded through
                    // tests/hooks/load-hook.js.
                    extends: true,
                    test: {
                        name: "hooks",
                        environment: "node",
                        include: ["tests/hooks/**/*.test.js"],
                    },
                },
            ],
        },
    }),
);
