export interface LoginResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
