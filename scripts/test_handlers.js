// Test script that calls handlers.handleRequest to exercise extractEntities via the voice pipeline
// Polyfill minimal browser globals used by handlers.js (window.location.origin and Response)
global.window = { location: { origin: "http://localhost" } };
class Response {
  constructor(body, { status = 200, headers = {} } = {}) {
    this._body = body;
    this.status = status;
    this.headers = headers;
  }
  async json() {
    return JSON.parse(this._body);
  }
  async text() {
    return this._body;
  }
}
global.Response = Response;

const jiti = require("jiti")(__filename);
const path = require("path");
const handlers = jiti(
  path.join(__dirname, "..", "src", "fakeServer", "handlers.js")
);
const handleRequest = handlers.handleRequest || handlers.default?.handleRequest;
if (typeof handleRequest !== "function") {
  console.error(
    "Could not find handleRequest export. Export keys:",
    Object.keys(handlers)
  );
  process.exit(2);
}

const phrases = [
  "set reminder sleep at 10:52 am",
  "remind me to take medicine at 9:00 p.m.",
  "Set reminder for 'Dentist' tomorrow at 4 pm",
  "please set reminder: water plants at 7am",
  "complete reminder 12345",
  "mark the 'Grocery' reminder as done",
  "set reminder sleep at 10.52 a.m.",
  "set reminder sleep at 10:52",
  "set reminder at 7",
  "set reminder for noon",
  "set reminder for 8pm to call mom",
];

(async () => {
  for (const p of phrases) {
    try {
      const res = await handleRequest("/api/voice/pipeline", {
        method: "POST",
        body: JSON.stringify({ transcript: p }),
      });
      const json = await res.json();
      console.log("PHRASE:", p);
      console.log(JSON.stringify(json.entities || json, null, 2));
      console.log("RESPONSE:", json.response || "");
      console.log("---");
    } catch (err) {
      console.error("Error processing phrase:", p, err);
    }
  }
})();
