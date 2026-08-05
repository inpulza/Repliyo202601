import type { Express } from "express";
import { requireAuth } from "../../middleware/requireAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", requireAuth, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json(req.user);
  });
}
