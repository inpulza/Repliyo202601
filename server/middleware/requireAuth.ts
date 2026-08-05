import type { RequestHandler } from "express";

import { sanitizeUser } from "../auth";
import { authStorage } from "../replit_integrations/auth/storage";
import { evaluateSessionAccess } from "../security/sessionAccess";
import { storage } from "../storage";

function revokeSession(req: Parameters<RequestHandler>[0]): void {
  req.session?.destroy(() => {});
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    let userId: string | undefined;

    if (
      req.isAuthenticated?.() &&
      (req.user as { claims?: { sub?: string } } | undefined)?.claims?.sub
    ) {
      const claims = (req.user as unknown as { claims: { sub: string } }).claims;
      let oauthUser = await authStorage.getUserByReplitId(claims.sub);
      if (!oauthUser) {
        oauthUser = await authStorage.upsertUserFromOAuth(claims);
      }
      userId = oauthUser.id;
    }

    userId ||= req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const record = await storage.getSessionAccessByUserId(userId);
    if (!record) {
      revokeSession(req);
      return res.status(401).json({ error: "User not found" });
    }

    const decision = evaluateSessionAccess(record);
    if (!decision.allowed) {
      revokeSession(req);
      return res.status(403).json({
        error: decision.error,
        code: decision.code,
        message: decision.message,
      });
    }

    req.user = sanitizeUser(record.user);
    return next();
  } catch (error) {
    return next(error);
  }
};
