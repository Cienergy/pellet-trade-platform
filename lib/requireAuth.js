import { getSession } from "./session";
import crypto from "crypto";

export default function requireAuth(handler) {
  return async function (req, res) {
    const incomingRequestId =
      req.headers["x-request-id"] ||
      req.headers["x-correlation-id"] ||
      req.headers["x-amzn-trace-id"];
    const requestId =
      typeof incomingRequestId === "string" && incomingRequestId.trim()
        ? incomingRequestId.trim()
        : crypto.randomUUID();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const session = await getSession(req);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.session = session;
    return handler(req, res);
  };
}
