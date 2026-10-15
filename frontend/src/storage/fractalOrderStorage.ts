import { FRACTAL_ORDER_STORAGE_KEY } from "../config/constants";
import type { FractalOrder } from "../domain/types/instability.types";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored" (by level).
export const fractalOrderStorage = {
  get(): FractalOrder {
    try {
      return localStorage.getItem(FRACTAL_ORDER_STORAGE_KEY) === "playOrder" ? "playOrder" : "fractal";
    } catch {
      return "fractal";
    }
  },
  set(order: FractalOrder): void {
    try {
      localStorage.setItem(FRACTAL_ORDER_STORAGE_KEY, order);
    } catch {
      /* ignore */
    }
  },
};
