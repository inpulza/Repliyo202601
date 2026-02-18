import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SentimentAlertRepository } from '../repositories/SentimentAlertRepository';
import { sentimentAnalysisService } from '../services/SentimentAnalysisService';
import { storage } from '../storage';
import { db } from '../db';
import { messages } from '@shared/schema';
import { eq, and, isNotNull, sql, notInArray } from 'drizzle-orm';
import type { AuthenticatedUser } from '../auth';

const validSeverities = ['P1', 'P2', 'P3', 'P4'] as const;
const validStatuses = ['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'] as const;

const alertListQuerySchema = z.object({
  severity: z.string().optional().transform(val =>
    val ? val.split(',').filter(s => validSeverities.includes(s as any)) : undefined
  ),
  status: z.string().optional().transform(val =>
    val ? val.split(',').filter(s => validStatuses.includes(s as any)) : undefined
  ),
  limit: z.string().optional().transform(val => Math.min(parseInt(val || '50') || 50, 200)),
  offset: z.string().optional().transform(val => Math.max(parseInt(val || '0') || 0, 0)),
});

const updateStatusBodySchema = z.object({
  status: z.enum(validStatuses),
  notes: z.string().max(2000).optional(),
});

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
    const parsed = alertListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.issues });
    }
    const { severity, status, limit, offset } = parsed.data;

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

router.get('/api/brands/:brandId/sentiment-alerts/by-conversation', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const alerts = await SentimentAlertRepository.getActiveAlertsByConversation(brandId);

    const severityRank: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const byConversation: Record<string, { severity: string; sentiment: string; category: string; status: string }> = {};
    for (const alert of alerts) {
      const existing = byConversation[alert.conversationId];
      if (!existing || (severityRank[alert.severity] || 99) < (severityRank[existing.severity] || 99)) {
        byConversation[alert.conversationId] = {
          severity: alert.severity,
          sentiment: alert.sentiment,
          category: alert.category,
          status: alert.status,
        };
      }
    }

    res.json({ success: true, conversations: byConversation });
  } catch (error: any) {
    console.error('[SentimentAlerts] By-conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts by conversation', details: error.message });
  }
});

router.patch('/api/brands/:brandId/sentiment-alerts/:id/status', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const parsed = updateStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    }
    const { status, notes } = parsed.data;

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

router.post('/api/brands/:brandId/sentiment-alerts/backfill', requireAuth, validateBrandAccess, async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const { limit: maxMessages = 100 } = req.body || {};

    const CRISIS_KEYWORDS = [
      'scam', 'fraud', 'estafa', 'steal', 'stolen', 'robo',
      'lawsuit', 'demanda', 'legal', 'lawyer', 'abogado',
      'police', 'policia', 'denuncia',
      'worst', 'terrible', 'horrible', 'disgusting',
      'never again', 'nunca mas', 'nunca más',
      'refund', 'reembolso', 'money back',
      'rip off', 'ripoff',
      'threat', 'amenaz',
      'angry', 'furious', 'furioso',
      'hate', 'odio',
      'urgent', 'urgente', 'emergency', 'emergencia',
      'disappointed', 'decepcion', 'decepción',
      'unacceptable', 'inaceptable',
      'complaint', 'queja',
      'broken', 'damaged', 'dañado',
      'dead', 'die', 'kill', 'morir',
      'help me', 'ayuda', 'socorro',
      'depresion', 'depresión', 'ansiedad', 'anxiety',
      'no aguanto', 'ya no puedo', 'necesito ayuda',
    ];

    const keywordCondition = CRISIS_KEYWORDS
      .map(kw => `m.content ILIKE '%${kw.replace(/'/g, "''")}%'`)
      .join(' OR ');

    const flaggedMessages = await db.execute(sql.raw(`
      SELECT m.id, m.content, m.platform, m.author, m.created_at, m.conversation_id
      FROM messages m
      WHERE m.direction = 'inbound'
        AND m.brand_id = '${brandId}'
        AND m.content IS NOT NULL
        AND LENGTH(m.content) > 10
        AND (${keywordCondition})
        AND m.id NOT IN (SELECT sa.message_id FROM sentiment_alerts sa WHERE sa.message_id IS NOT NULL)
      ORDER BY m.created_at DESC
      LIMIT ${Math.min(Number(maxMessages) || 100, 200)}
    `));

    const messagesToProcess = flaggedMessages.rows || flaggedMessages;
    const totalFound = Array.isArray(messagesToProcess) ? messagesToProcess.length : 0;

    res.json({
      success: true,
      status: 'started',
      totalMessages: totalFound,
      message: `Processing ${totalFound} flagged messages in background. Check Crisis Alerts dashboard for results.`,
    });

    (async () => {
      let processed = 0;
      let alertsCreated = 0;
      let errors = 0;

      for (const msg of (messagesToProcess as any[])) {
        try {
          const outcome = await sentimentAnalysisService.processInboundMessage(
            msg.id,
            msg.content,
            brandId,
            msg.conversation_id,
            msg.platform || 'unknown',
            msg.author || 'unknown',
            new Date(msg.created_at),
          );

          if (outcome.alertCreated) alertsCreated++;
          processed++;

          if (processed % 10 === 0) {
            console.log(`[Backfill] Brand ${brandId}: ${processed}/${totalFound} processed, ${alertsCreated} alerts created`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          errors++;
          console.error(`[Backfill] Error processing message ${msg.id}:`, err);
        }
      }

      console.log(`[Backfill] COMPLETED for brand ${brandId}: ${processed} processed, ${alertsCreated} alerts created, ${errors} errors`);
    })();
  } catch (error: any) {
    console.error('[SentimentAlerts] Backfill error:', error);
    res.status(500).json({ error: 'Failed to start backfill', details: error.message });
  }
});

export default router;
