import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export default async function globalSetup() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, VITE_API_URL: "http://127.0.0.1:8001/api" },
  });
  execFileSync("python", ["backend/seed_demo.py", "--reset"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}
