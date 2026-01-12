import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./index.css"
import { installFakeServer } from "./fakeServer/index.js"

async function start() {
  await installFakeServer()
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

start()
