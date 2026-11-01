import { getDatabase } from "../server/db.js";
const db = await getDatabase();
if (!db) throw new Error("Configure MONGODB_URI first.");
console.log(
  "Collections, indexes and sample catalog initialized; existing products were preserved.",
);
await db.close();
