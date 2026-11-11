import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../prisma';
import { AppError } from '../../utils/http';
import { signToken } from '../../utils/jwt';
import { LoginInput, RegisterInput } from './auth.schemas';

/** Herkese açık kayıt yalnızca MÜŞTERİ rolü oluşturur. */
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'Bu e-posta zaten kayıtlı');
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: Role.CUSTOMER,
    },
  });
  return toAuthResult(user);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, 'E-posta veya parola hatalı');
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'E-posta veya parola hatalı');
  }
  return toAuthResult(user);
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staffProfile: true },
  });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
  const { passwordHash, ...safe } = user;
  return safe;
}

function toAuthResult(user: { id: number; email: string; role: Role; fullName: string }) {
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
  };
}
