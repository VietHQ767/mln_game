import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AudioSettingsProvider } from "./contexts/AudioSettingsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AudioSettingsProvider>
      <App />
    </AudioSettingsProvider>
  </React.StrictMode>
);
