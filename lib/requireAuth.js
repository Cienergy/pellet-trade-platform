import { prisma } from "./prisma";
import { parse } from "cookie";

export function requireAuth(handler) {
  return async (req, res) => {
    const cookies = parse(req.headers.cookie || "");
    const userId = cookies.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { org: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    return handler(req, res);
  };
}
