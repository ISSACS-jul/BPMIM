import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { inicializarTemaYEscala } from "./utils/theme";

// Inicializar tema visual ergonómico y escala UI guardados antes de montar la app
inicializarTemaYEscala();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
