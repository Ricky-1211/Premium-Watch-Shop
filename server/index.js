import { createApp } from "./app.js";
import { getDatabase } from "./db.js";
await getDatabase();
const port = Number(process.env.PORT || 3001);
const server = createApp().listen(port, "0.0.0.0", () =>
  console.log(`AUREL API ready on http://localhost:${port}`),
);
const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
