import crypto from "crypto";
import prisma from "./prisma";

const COOKIE_PREFIX = "cienergy_session";
const SLOTS = [1, 2, 3, 4];
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const SESSION_MAX_AGE_DAYS = 30; // Maximum session age in days

function getSlot(req) {
  const slot = req.headers["x-session-slot"];
  const n = slot ? parseInt(slot, 10) : 1;
  return SLOTS.includes(n) ? n : 1;
}

function cookieName(slot) {
  return `${COOKIE_PREFIX}_${slot}`;
}

export async function createSession(res, { userId, role, orgId }, slot = 1) {
  const s = SLOTS.includes(Number(slot)) ? Number(slot) : 1;
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);

  await prisma.session.create({
    data: {
      id: crypto.randomUUID(),
      token,
      userId,
      expiresAt,
      lastActivityAt: now,
    },
  });

  const name = cookieName(s);
  const cookieOptions = [
    `${name}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_DAYS * 24 * 60 * 60}`,
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");

  res.setHeader("Set-Cookie", cookieOptions);
}

export async function getSession(req) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  const slot = getSlot(req);
  const name = cookieName(slot);
  const re = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`);
  const match = cookie.match(re);
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

  const now = new Date();

  // Check if session has expired (max age)
  if (now > session.expiresAt) {
    // Delete expired session
    await prisma.session.deleteMany({
      where: { token },
    });
    return null;
  }

  // Check for inactivity timeout (15 minutes)
  const timeSinceLastActivity = now.getTime() - new Date(session.lastActivityAt).getTime();
  if (timeSinceLastActivity > INACTIVITY_TIMEOUT_MS) {
    // Delete inactive session
    await prisma.session.deleteMany({
      where: { token },
    });
    return null;
  }

  // Update last activity timestamp
  await prisma.session.update({
    where: { token },
    data: { lastActivityAt: now },
  });

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

  const slot = getSlot(req);
  const name = cookieName(slot);
  const re = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`);
  const match = cookie.match(re);
  if (!match) return;

  const token = match[1];

  await prisma.session.deleteMany({
    where: { token },
  });

  res.setHeader("Set-Cookie", `${name}=; Path=/; Max-Age=0`);
}
