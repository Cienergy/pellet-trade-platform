import bcrypt from "bcrypt";
import { prisma } from "./prisma";

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email, password) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    role: user.role,
    orgId: user.orgId
  };
}
