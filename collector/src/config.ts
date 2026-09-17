import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

// ESM imports are hoisted: every `import` in a module runs before that module's
// own statements. So loading .env inside index.ts is too late — kinesis.ts has
// already read process.env by then. Importing this module first guarantees the
// environment is populated before anything else reads it.
//
// Resolved relative to THIS FILE, not the working directory, so the collector
// works regardless of where it is started from.
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });
