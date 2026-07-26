export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  idUser: number;
  firstName: string;
  lastName: string;
  userEmail: string;
  securityLevel: number;
  idUserRole: number;
  roleName: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}
