import { destroySession } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  await destroySession(req, res);
  
  // Redirect to login page
  res.writeHead(302, { Location: "/login" });
  res.end();
}
