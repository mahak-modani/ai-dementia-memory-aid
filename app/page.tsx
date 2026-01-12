"use client";

import App from "../src/App";
import { installFakeServer } from "../src/fakeServer/index";
import { useEffect } from "react";

function ClientInit() {
  useEffect(() => {
    installFakeServer().catch((e) => {
      // eslint-disable-next-line no-console
      console.error("Failed to install fake server:", e);
    });
  }, []);

  return null;
}

export default function Page() {
  return (
    <>
      <ClientInit />
      <App />
    </>
  );
}
