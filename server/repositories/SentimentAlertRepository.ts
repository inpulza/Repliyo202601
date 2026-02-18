import { db } from "../db";
import { sentimentAlerts } from "@shared/schema";
import type { InsertSentimentAlert, SentimentAlert } from "@shared/schema";
import { eq, and, desc, inArray, sql, count } from "drizzle-orm";

export class SentimentAlertRepository {
  static async create(data: InsertSentimentAlert): Promise<SentimentAlert> {
    const [alert] = await db
      .insert(sentimentAlerts)
      .values(data)
      .returning();
    return alert;
  }

  static async getById(id: string): Promise<SentimentAlert | null> {
    const [alert] = await db
      .select()
      .from(sentimentAlerts)
      .where(eq(sentimentAlerts.id, id));
    return alert || null;
  }

  static async getByBrand(
    brandId: string,
    options?: {
      severity?: string[];
      status?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<SentimentAlert[]> {
    const conditions = [eq(sentimentAlerts.brandId, brandId)];

    if (options?.severity && options.severity.length > 0) {
      conditions.push(inArray(sentimentAlerts.severity, options.severity));
    }

    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(sentimentAlerts.status, options.status));
    }

    return db
      .select()
      .from(sentimentAlerts)
      .where(and(...conditions))
      .orderBy(desc(sentimentAlerts.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  static async getByMessageId(messageId: string): Promise<SentimentAlert | null> {
    const [alert] = await db
      .select()
      .from(sentimentAlerts)
      .where(eq(sentimentAlerts.messageId, messageId));
    return alert || null;
  }

  static async updateStatus(
    id: string,
    status: string,
    userId?: string,
    notes?: string
  ): Promise<SentimentAlert | null> {
    const updateData: Record<string, unknown> = { status };

    if (status === 'acknowledged') {
      updateData.acknowledgedBy = userId || null;
      updateData.acknowledgedAt = new Date();
    } else if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedBy = userId || null;
      updateData.resolvedAt = new Date();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updated] = await db
      .update(sentimentAlerts)
      .set(updateData)
      .where(eq(sentimentAlerts.id, id))
      .returning();
    return updated || null;
  }

  static async getStatsByBrand(brandId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const alerts = await db
      .select()
      .from(sentimentAlerts)
      .where(eq(sentimentAlerts.brandId, brandId));

    const stats = {
      total: alerts.length,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    for (const alert of alerts) {
      stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1;
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
    }

    return stats;
  }

  static async getActiveAlertCount(brandId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(sentimentAlerts)
      .where(
        and(
          eq(sentimentAlerts.brandId, brandId),
          inArray(sentimentAlerts.status, ['new', 'acknowledged', 'in_progress']),
          inArray(sentimentAlerts.severity, ['P1', 'P2'])
        )
      );
    return result?.count || 0;
  }
}
