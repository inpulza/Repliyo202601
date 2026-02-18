import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { SentimentAlertRepository } from '../repositories/SentimentAlertRepository';
import { storage } from '../storage';
import type { AuthenticatedUser } from '../auth';

const router = Router();

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  let user = null;

  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    user = req.user as AuthenticatedUser;
  }

  if (!user && (req.session as any)?.userId) {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (sessionUser) {
      user = sessionUser as AuthenticatedUser;
    }
  }

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  (req as any).user = user;
  next();
};

const validateBrandAccess = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as AuthenticatedUser;
  const brandId = req.params.brandId;

  if (!brandId) {
    return res.status(400).json({ error: "Brand ID is required" });
  }

  if (user.role !== 'admin') {
    if (!user.brandId) {
      return res.status(403).json({ error: "User not associated with any brand" });
    }
    if (brandId !== user.brandId) {
      return res.status(403).json({ error: "Access denied to this brand" });
    }
  }

  next();
};

router.get('/api/brands/:brandId/sentiment-alerts', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const severity = req.query.severity ? (req.query.severity as string).split(',') : undefined;
    const status = req.query.status ? (req.query.status as string).split(',') : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const alerts = await SentimentAlertRepository.getByBrand(brandId, {
      severity,
      status,
      limit,
      offset,
    });

    res.json({ success: true, alerts, count: alerts.length });
  } catch (error: any) {
    console.error('[SentimentAlerts] List error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts', details: error.message });
  }
});

router.get('/api/brands/:brandId/sentiment-alerts/stats', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const stats = await SentimentAlertRepository.getStatsByBrand(brandId);
    res.json({ success: true, ...stats });
  } catch (error: any) {
    console.error('[SentimentAlerts] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

router.get('/api/brands/:brandId/sentiment-alerts/count', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const count = await SentimentAlertRepository.getActiveAlertCount(brandId);
    res.json({ success: true, count });
  } catch (error: any) {
    console.error('[SentimentAlerts] Count error:', error);
    res.status(500).json({ error: 'Failed to fetch count', details: error.message });
  }
});

router.patch('/api/brands/:brandId/sentiment-alerts/:id/status', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = (req as any).user;

    const validStatuses = ['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const alert = await SentimentAlertRepository.getById(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.brandId !== req.params.brandId) {
      return res.status(403).json({ error: 'Alert does not belong to this brand' });
    }

    const updated = await SentimentAlertRepository.updateStatus(id, status, user?.id, notes);
    res.json({ success: true, alert: updated });
  } catch (error: any) {
    console.error('[SentimentAlerts] Update status error:', error);
    res.status(500).json({ error: 'Failed to update alert', details: error.message });
  }
});

router.get('/api/brands/:brandId/sentiment-alerts/:id', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { id, brandId } = req.params;
    const alert = await SentimentAlertRepository.getById(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    if (alert.brandId !== brandId) {
      return res.status(403).json({ error: 'Alert does not belong to this brand' });
    }
    res.json({ success: true, alert });
  } catch (error: any) {
    console.error('[SentimentAlerts] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch alert', details: error.message });
  }
});

export default router;
