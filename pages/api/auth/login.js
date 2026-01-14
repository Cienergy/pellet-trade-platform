import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await createSession(res, {
    userId: user.id,
    role: user.role,
    orgId: user.orgId,
  });

  res.status(200).json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
