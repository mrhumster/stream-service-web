export interface LoginResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Success {
  message: string;
  generated_at: string;
}
