export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult extends AuthTokens {
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface AuthTokenPayload {
  sub: string;
  sid: string;
  jti: string;
}

export type AuthErrorCode =
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REVOKED'
  | 'SESSION_INVALID'
  | 'INVALID_ACCESS_TOKEN'
  | 'MISSING_BEARER_TOKEN';
