export interface JWTPayload {
  sub: string;
  username: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface RequestContext {
  userId?: string;
  username?: string;
  role?: string;
  requestId: string;
  logger: ReturnType<typeof import('./logger').createLogger>;
}
