import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/liquidGlassDialogs.css";
import "./styles/parameterSlider.css";
import "./styles/zenMode.css";
import "./styles/workspace.css";
import "./styles/ui.css";
import "./styles/liquidGlassSurfaces.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
