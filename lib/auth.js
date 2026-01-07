import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export async function authenticateUser(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return user;
}
