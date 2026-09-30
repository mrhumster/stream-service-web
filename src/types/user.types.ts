export interface UserResponse {
  id: string;
  email: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsersListReponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}
