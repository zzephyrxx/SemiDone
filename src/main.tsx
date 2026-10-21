import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/liquidGlassDialogs.css";
import "./styles/liquidGlassPreview.css";
import "./styles/parameterSlider.css";
import "./styles/zenMode.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
