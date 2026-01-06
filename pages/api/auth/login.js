import { authenticateUser } from "../../../lib/auth";
import { serialize } from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const session = {
    userId: user.id,
    role: user.role,
    orgId: user.orgId
  };

  res.setHeader(
    "Set-Cookie",
    serialize("userId", user.id, {
      httpOnly: true,
      path: "/",
      sameSite:"lax",
    })
  );

  res.json({ success: true });
}
