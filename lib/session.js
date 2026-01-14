import crypto from "crypto";
import prisma from "./prisma";

const COOKIE_NAME = "cienergy_session";

export async function createSession(res, { userId, role, orgId }) {
  const token = crypto.randomUUID();
  // Session expires in 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
  );
}

export async function getSession(req) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  const match = cookie.match(/cienergy_session=([^;]+)/);
  if (!match) return null;

  const token = match[1];

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session || !session.user || !session.user.active) {
    return null;
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    // Delete expired session
    await prisma.session.deleteMany({
      where: { token },
    });
    return null;
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    orgId: session.user.orgId,
    user: session.user,
  };
}

export async function destroySession(req, res) {
  const cookie = req.headers.cookie;
  if (!cookie) return;

  const match = cookie.match(/cienergy_session=([^;]+)/);
  if (!match) return;

  const token = match[1];

  await prisma.session.deleteMany({
    where: { token },
  });

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; Max-Age=0`
  );
}
