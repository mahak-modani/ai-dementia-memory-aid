// Test script for the improved predictEmotion
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

// polyfill window and Response used by handler
global.window = { location: { origin: "http://localhost" } };
class Response {
  constructor(body, { status = 200 } = {}) {
    this._body = body;
    this.status = status;
  }
  async json() {
    return JSON.parse(this._body);
  }
}
global.Response = Response;

const samples = [
  "thank you so much I feel very happy",
  "please help me I feel very scared",
  "hello thank you",
  "I am so angry about this!",
  "I need help, I am panicking",
  "I feel really sad and lonely",
  "That was great, thank you!",
  "meh",
  "I am frustrated and annoyed",
  "Thanks",
];

(async () => {
  for (const t of samples) {
    const res = await handleRequest("/api/voice/pipeline", {
      method: "POST",
      body: JSON.stringify({ transcript: t }),
    });
    const j = await res.json();
    console.log("INPUT:", t);
    console.log(
      "EMOTION:",
      j.emotion,
      "CONFIDENCE:",
      j.emotionConfidence || j.emotion?.confidence || "n/a"
    );
    console.log("RESPONSE:", j.response);
    console.log("---");
  }
})();
