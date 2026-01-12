// Quick inspect script for the fake server db
// Uses jiti so it can import ESM-style modules from the project without changing package.json
const jiti = require("jiti")(__filename);
const path = require("path");
const mod = jiti(path.join(__dirname, "..", "src", "fakeServer", "db.js"));
const db = mod.db || mod.default?.db || mod;
if (!db) {
  console.error(
    "Could not load db from module. Export keys:",
    Object.keys(mod)
  );
  process.exit(2);
}
console.log("alerts count:", (db.alerts || []).length);
console.log("alerts sample:", (db.alerts || []).slice(0, 3));
console.log("mood average:", db.mood?.average);
console.log("mood series length:", (db.mood?.todaySeries || []).length);
console.log("scheduleToday length:", (db.scheduleToday || []).length);
console.log("reminders count:", (db.reminders || []).length);
