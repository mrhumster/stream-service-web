export interface UserResponse {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UsersListReponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}
