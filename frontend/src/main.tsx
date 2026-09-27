import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nProvider } from "./controllers/I18nController";
import { AuthProvider } from "./controllers/AuthController";
import { LogsProvider } from "./controllers/LogsController";
import { SessionsProvider } from "./controllers/SessionsController";
import AppRouter from "./presentation/AppRouter";
import "./presentation/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <LogsProvider>
            <SessionsProvider>
              <AppRouter />
            </SessionsProvider>
          </LogsProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
