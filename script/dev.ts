/**
 * Dev launcher — kill port 5000 dulu baru start server.
 * Works on Windows (PowerShell) & Unix (lsof/fuser).
 */

import { execSync, spawn } from "child_process";
import { platform } from "os";

const PORT = 5000;

// ─── Kill port ────────────────────────────────────────────────────────────────
try {
  if (platform() === "win32") {
    execSync(
      `powershell -NoProfile -Command "` +
        `Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue ` +
        `| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" `,
      { stdio: "ignore" }
    );
  } else {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, {
      stdio: "ignore",
      shell: true,
    });
  }
  console.log(`✓ Port ${PORT} siap digunakan`);
} catch {
  // Port memang belum dipakai — lanjut saja
}

// ─── Start server ─────────────────────────────────────────────────────────────
const server = spawn("tsx", ["server/index.ts"], {
  stdio: "inherit",
  shell: true,
});

server.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT",  () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
