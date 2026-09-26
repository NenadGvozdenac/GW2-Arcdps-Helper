import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { uploaderBridge } from "../repositories/uploaderBridge";
import type { AppState } from "../../../shared/app.types";

const AppStateContext = createContext<AppState | null>(null);

/** Mirrors the main process state; every change is pushed over IPC. */
export function AppStateProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    const unsubscribe = uploaderBridge.onStateChanged(setState);
    uploaderBridge.getState().then((s) => setState((current) => current ?? s));
    return unsubscribe;
  }, []);

  if (!state) return <>{fallback}</>;
  return <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
