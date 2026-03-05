import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email, password, slot } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const sessionSlot = [1, 2, 3, 4].includes(Number(slot)) ? Number(slot) : 1;

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

  await createSession(
    res,
    {
      userId: user.id,
      role: user.role,
      orgId: user.orgId,
    },
    sessionSlot
  );

  await logAudit({
    actorId: user.id,
    entity: "user",
    entityId: user.id,
    action: "login",
  });

  res.status(200).json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
