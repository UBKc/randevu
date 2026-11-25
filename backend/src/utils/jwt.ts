import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';

export interface JwtPayload {
  sub: number;
  role: Role;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as unknown as JwtPayload;
}
