export interface User {
  id: string;
  email: string;
  displayName: string;
  gw2Account: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  displayName: string;
  gw2Account: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileUpdate {
  displayName: string;
  gw2Account: string;
}
