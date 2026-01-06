import { parse } from "cookie";
import { prisma } from "./prisma";

export async function getUserFromSession(req) {
  const cookies = parse(req.headers.cookie || "");
  const userId = cookies.userId;

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { org: true },
  });

  return user;
}
