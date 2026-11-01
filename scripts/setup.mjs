import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Please install Node.js 24 LTS first.");
  process.exit(1);
}
if (existsSync(".env")) {
  console.log(".env already exists; it was preserved. Run npm run dev.");
} else {
  const password = randomBytes(15).toString("base64url");
  writeFileSync(
    ".env",
    readFileSync(".env.example", "utf8").replace(
      "ADMIN_PASSWORD=",
      "ADMIN_PASSWORD=" + password,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Local setup complete. Admin email: admin@aurel.local\nYour generated admin password is stored in .env.\nRun npm run dev and open http://localhost:5173.",
  );
}
