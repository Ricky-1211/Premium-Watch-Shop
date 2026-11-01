import { spawn } from "node:child_process";
import process from "node:process";
const children = [];
const run = (args, env = {}) => {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code) stop(code);
  });
};
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill();
  setTimeout(() => process.exit(code), 150);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
run(["--env-file-if-exists=.env", "server/index.js"], { PORT: "3001" });
const extra = process.argv.slice(2);
const portIndex = extra.indexOf("--port");
const vitePort =
  portIndex >= 0 ? extra[portIndex + 1] : process.env.PORT || "5173";
run([
  "node_modules/vite/bin/vite.js",
  "--host",
  "0.0.0.0",
  "--port",
  vitePort,
  ...(extra.includes("--strictPort") ? ["--strictPort"] : []),
]);
