import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

/**
 * Loading a PocketBase hook module into a test.
 *
 * The files in pb/pb_hooks are CommonJS scripts written for PocketBase's own
 * JS runtime, in a repo whose package.json says "type": "module", so Node
 * will not import them as they are. Rather than change their format to suit
 * the test runner - PocketBase is the runtime that matters - each is
 * evaluated here the way PocketBase evaluates it: as a function body handed
 * `module`, a `require` that resolves `${__hooks}/...`, and the PocketBase
 * globals.
 *
 * Only what the pure functions touch is provided. A test that needs `$app`,
 * `Record` or anything else passes its own stand-in through `globals`.
 */

export const HOOKS_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../pb/pb_hooks",
);

class ApiError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
    }
}

/** The error classes PocketBase gives a hook, so a test can assert on them. */
export class BadRequestError extends ApiError {}
export class UnauthorizedError extends ApiError {}
export class ForbiddenError extends ApiError {}
export class NotFoundError extends ApiError {}
export class InternalServerError extends ApiError {}

const POCKETBASE_GLOBALS = {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    InternalServerError,
};

/**
 * Evaluate a hook module and return its `module.exports`.
 *
 * @param {string} file - a file name in pb/pb_hooks, e.g.
 *   "procedure-checklists.js"
 * @param {Object} [globals] - extra globals the module should see, added to
 *   (or replacing) the PocketBase error classes
 */
export function loadHook(file, globals = {}) {
    const scope = { ...POCKETBASE_GLOBALS, ...globals };
    const names = Object.keys(scope);
    const values = Object.values(scope);
    // One copy of each module per load, as a real require() would give.
    const loaded = new Map();

    const load = (request) => {
        const filename = path.resolve(HOOKS_DIR, request);
        if (loaded.has(filename)) return loaded.get(filename).exports;

        const module = { exports: {} };
        loaded.set(filename, module);

        const run = vm.compileFunction(
            readFileSync(filename, "utf8"),
            ["module", "exports", "require", "__hooks", ...names],
            // The real path, so a failure points at the hook's own line.
            { filename },
        );
        run(module, module.exports, load, HOOKS_DIR, ...values);

        return module.exports;
    };

    return load(file);
}
