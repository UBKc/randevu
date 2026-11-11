import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';

export interface JwtPayload {
  sub: number; // user id
  role: Role;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  // jwt.verify string | jwt.JwtPayload döndürür; kendi tipimize dönüştürüyoruz.
  return jwt.verify(token, config.jwtSecret) as unknown as JwtPayload;
}
