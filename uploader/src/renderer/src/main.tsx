import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Loader2Icon } from "lucide-react";
import { AppStateProvider } from "./controllers/AppStateController";
import App from "./presentation/App";
import "./presentation/styles.css";

const loading = (
  <div className="grid min-h-svh place-items-center">
    <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
  </div>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppStateProvider fallback={loading}>
      <App />
    </AppStateProvider>
  </StrictMode>,
);
