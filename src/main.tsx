import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { installGlobalHandlers } from "./shared/log";

import "./index.css";

installGlobalHandlers();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
