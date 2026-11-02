import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { installGlobalHandlers } from "./shared/log";
import { initTelemetry } from "./shared/telemetry";

import "./index.css";

installGlobalHandlers();
initTelemetry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
