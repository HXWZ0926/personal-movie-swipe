import { existsSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";

const apiDir = "app/api";
const disabledApiDir = ".api-disabled-for-pages";

function moveApiAway() {
  if (existsSync(disabledApiDir)) {
    renameSync(disabledApiDir, apiDir);
  }
  if (existsSync(apiDir)) {
    renameSync(apiDir, disabledApiDir);
  }
}

function restoreApi() {
  if (existsSync(disabledApiDir)) {
    renameSync(disabledApiDir, apiDir);
  }
}

process.env.GITHUB_PAGES = "true";

try {
  moveApiAway();
  const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    stdio: "inherit",
    env: process.env
  });
  process.exitCode = result.status ?? 1;
} finally {
  restoreApi();
}
