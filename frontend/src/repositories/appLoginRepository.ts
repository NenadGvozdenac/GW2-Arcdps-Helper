import type { AppLoginRequest } from "../domain/types/appLogin.types";
import { http } from "./httpClient";

const path = (id: string) => `/auth/app-login/${encodeURIComponent(id)}`;

export const appLoginRepository = {
  async get(id: string): Promise<AppLoginRequest> {
    const { request } = await http.get<{ request: Omit<AppLoginRequest, "expiresAt"> & { expiresAt: string } }>(path(id));
    return { ...request, expiresAt: new Date(request.expiresAt) };
  },

  approve: (id: string) => http.post<void>(`${path(id)}/approve`),

  deny: (id: string) => http.post<void>(`${path(id)}/deny`),
};
