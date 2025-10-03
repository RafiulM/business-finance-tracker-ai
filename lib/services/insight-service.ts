import { db } from '@/db';
import {
  insight,
  transaction,
  category,
  user,
  type Insight,
  type NewInsight,
  type InsightType,
  type InsightImpact
} from '@/db/schema';
import { eq, and, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

export class InsightService {
  /**
   * Create a new insight
   */
  async createInsight(insightData: {
    type: InsightType;
    title: string;
    description: string;
    confidence: number;
    impact: InsightImpact;
    userId: string;
    categoryId?: string;
    timePeriod?: {
      startDate: string;
      endDate: string;
    };
    data?: Record<string, any>;
    recommendations?: string[];
    isRead?: boolean;
  }): Promise<Insight> {
    // Validate confidence
    if (insightData.confidence < 0 || insightData.confidence > 100) {
      throw new Error('Confidence must be between 0 and 100');
    }

    // Validate category if provided
    if (insightData.categoryId) {
      const categoryRecord = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.id, insightData.categoryId),
            eq(category.userId, insightData.userId),
            eq(category.deletedAt, null)
          )
        )
        .limit(1);

      if (categoryRecord.length === 0) {
        throw new Error('Category not found or does not belong to user');
      }
    }

    const newInsight: NewInsight = {
      id: createId(),
      type: insightData.type,
      title: insightData.title.trim(),
      description: insightData.description.trim(),
      confidence: insightData.confidence,
      impact: insightData.impact,
      userId: insightData.userId,
      categoryId: insightData.categoryId || null,
      timePeriod: insightData.timePeriod || null,
      data: insightData.data || {},
      recommendations: insightData.recommendations || [],
      isRead: insightData.isRead || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdInsight] = await db
      .insert(insight)
      .values(newInsight)
      .returning();

    return createdInsight;
  }

  /**
   * Get insight by ID
   */
  async getInsightById(insightId: string, userId: string): Promise<Insight | null> {
    const [insightRecord] = await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(
        and(
          eq(insight.id, insightId),
          eq(insight.userId, userId)
        )
      )
      .limit(1);

    return insightRecord || null;
  }

  /**
   * Get all insights for a user
   */
  async getUserInsights(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: InsightType;
      impact?: InsightImpact;
      isRead?: boolean;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: 'createdAt' | 'confidence' | 'impact';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    insights: Insight[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 50,
      offset = 0,
      type,
      impact,
      isRead,
      categoryId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Build conditions
    const conditions = [eq(insight.userId, userId)];

    if (type) {
      conditions.push(eq(insight.type, type));
    }

    if (impact) {
      conditions.push(eq(insight.impact, impact));
    }

    if (isRead !== undefined) {
      conditions.push(eq(insight.isRead, isRead));
    }

    if (categoryId) {
      conditions.push(eq(insight.categoryId, categoryId));
    }

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(insight.createdAt, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(insight.createdAt, end));
    }

    // Build order by
    let orderBy;
    if (sortBy === 'createdAt') {
      orderBy = sortOrder === 'asc' ? asc(insight.createdAt) : desc(insight.createdAt);
    } else if (sortBy === 'confidence') {
      orderBy = sortOrder === 'asc' ? asc(insight.confidence) : desc(insight.confidence);
    } else if (sortBy === 'impact') {
      const impactOrder = { low: 1, medium: 2, high: 3 };
      // This would need to be implemented with a CASE statement in SQL
      orderBy = desc(insight.createdAt); // Fallback to created date
    } else {
      orderBy = desc(insight.createdAt);
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: insight.id })
      .from(insight)
      .where(and(...conditions));

    // Get insights
    const insights = await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      insights,
      total: Number(count),
      hasMore: offset + insights.length < Number(count)
    };
  }

  /**
   * Get unread insights for a user
   */
  async getUnreadInsights(userId: string, limit: number = 20): Promise<Insight[]> {
    return await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(
        and(
          eq(insight.userId, userId),
          eq(insight.isRead, false)
        )
      )
      .orderBy(desc(insight.createdAt))
      .limit(limit);
  }

  /**
   * Mark insight as read
   */
  async markInsightAsRead(insightId: string, userId: string): Promise<Insight> {
    const existingInsight = await this.getInsightById(insightId, userId);
    if (!existingInsight) {
      throw new Error('Insight not found');
    }

    const [updatedInsight] = await db
      .update(insight)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(insight.id, insightId))
      .returning();

    return updatedInsight;
  }

  /**
   * Mark multiple insights as read
   */
  async markMultipleInsightsAsRead(insightIds: string[], userId: string): Promise<number> {
    if (insightIds.length === 0) {
      return 0;
    }

    // Verify all insights belong to user
    const userInsights = await db
      .select()
      .from(insight)
      .where(
        and(
          inArray(insight.id, insightIds),
          eq(insight.userId, userId)
        )
      );

    if (userInsights.length !== insightIds.length) {
      throw new Error('Some insights not found or do not belong to user');
    }

    const result = await db
      .update(insight)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(inArray(insight.id, insightIds));

    return result.rowCount || 0;
  }

  /**
   * Mark all insights as read for a user
   */
  async markAllInsightsAsRead(userId: string): Promise<number> {
    const result = await db
      .update(insight)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(insight.userId, userId));

    return result.rowCount || 0;
  }

  /**
   * Update insight
   */
  async updateInsight(
    insightId: string,
    userId: string,
    updateData: Partial<Omit<Insight, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Insight> {
    const existingInsight = await this.getInsightById(insightId, userId);
    if (!existingInsight) {
      throw new Error('Insight not found');
    }

    // Validate confidence if provided
    if (updateData.confidence !== undefined && (updateData.confidence < 0 || updateData.confidence > 100)) {
      throw new Error('Confidence must be between 0 and 100');
    }

    // Validate category if provided
    if (updateData.categoryId) {
      const categoryRecord = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.id, updateData.categoryId),
            eq(category.userId, userId),
            eq(category.deletedAt, null)
          )
        )
        .limit(1);

      if (categoryRecord.length === 0) {
        throw new Error('Category not found or does not belong to user');
      }
    }

    const [updatedInsight] = await db
      .update(insight)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(insight.id, insightId))
      .returning();

    return updatedInsight;
  }

  /**
   * Delete insight
   */
  async deleteInsight(insightId: string, userId: string): Promise<void> {
    const existingInsight = await this.getInsightById(insightId, userId);
    if (!existingInsight) {
      throw new Error('Insight not found');
    }

    await db
      .delete(insight)
      .where(eq(insight.id, insightId));
  }

  /**
   * Get insights by type
   */
  async getInsightsByType(
    userId: string,
    type: InsightType,
    limit: number = 50
  ): Promise<Insight[]> {
    return await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(
        and(
          eq(insight.userId, userId),
          eq(insight.type, type)
        )
      )
      .orderBy(desc(insight.createdAt))
      .limit(limit);
  }

  /**
   * Get insights by impact level
   */
  async getInsightsByImpact(
    userId: string,
    impact: InsightImpact,
    limit: number = 50
  ): Promise<Insight[]> {
    return await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(
        and(
          eq(insight.userId, userId),
          eq(insight.impact, impact)
        )
      )
      .orderBy(desc(insight.createdAt))
      .limit(limit);
  }

  /**
   * Get insight statistics
   */
  async getInsightStats(userId: string): Promise<{
    totalInsights: number;
    unreadInsights: number;
    insightsByType: Record<InsightType, number>;
    insightsByImpact: Record<InsightImpact, number>;
    averageConfidence: number;
    recentInsights: number; // Last 30 days
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allInsights = await db
      .select()
      .from(insight)
      .where(eq(insight.userId, userId));

    const unreadInsights = allInsights.filter(insight => !insight.isRead);
    const recentInsights = allInsights.filter(insight => insight.createdAt >= thirtyDaysAgo);

    // Group by type
    const insightsByType: Record<InsightType, number> = {
      spending_trend: 0,
      anomaly: 0,
      cash_flow: 0,
      recommendation: 0,
      budget_alert: 0,
      goal_progress: 0,
      tax_opportunity: 0,
    };

    allInsights.forEach(insight => {
      insightsByType[insight.type]++;
    });

    // Group by impact
    const insightsByImpact: Record<InsightImpact, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    allInsights.forEach(insight => {
      insightsByImpact[insight.impact]++;
    });

    // Calculate average confidence
    const averageConfidence = allInsights.length > 0
      ? allInsights.reduce((sum, insight) => sum + insight.confidence, 0) / allInsights.length
      : 0;

    return {
      totalInsights: allInsights.length,
      unreadInsights: unreadInsights.length,
      insightsByType,
      insightsByImpact,
      averageConfidence,
      recentInsights: recentInsights.length,
    };
  }

  /**
   * Get insights with pagination for dashboard
   */
  async getDashboardInsights(
    userId: string,
    limit: number = 10
  ): Promise<{
    unread: Insight[];
    recent: Insight[];
    highImpact: Insight[];
  }> {
    const [unread, recent, highImpact] = await Promise.all([
      this.getUnreadInsights(userId, limit),
      this.getInsightsByImpact(userId, 'high', limit),
      this.getRecentInsights(userId, limit),
    ]);

    return {
      unread,
      recent: highImpact.length > 0 ? highImpact : recent,
      highImpact,
    };
  }

  /**
   * Get recent insights
   */
  private async getRecentInsights(userId: string, limit: number): Promise<Insight[]> {
    return await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(eq(insight.userId, userId))
      .orderBy(desc(insight.createdAt))
      .limit(limit);
  }

  /**
   * Search insights
   */
  async searchInsights(
    userId: string,
    query: string,
    limit: number = 50
  ): Promise<Insight[]> {
    return await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(
        and(
          eq(insight.userId, userId),
          // This would need to be implemented with proper full-text search
          // For now, using a simple approach
          insight.title.toLowerCase().includes(query.toLowerCase()) ||
          insight.description.toLowerCase().includes(query.toLowerCase())
        )
      )
      .orderBy(desc(insight.createdAt))
      .limit(limit);
  }

  /**
   * Create batch insights from AI analysis
   */
  async createBatchInsights(
    userId: string,
    insightsData: Array<{
      type: InsightType;
      title: string;
      description: string;
      confidence: number;
      impact: InsightImpact;
      categoryId?: string;
      timePeriod?: {
        startDate: string;
        endDate: string;
      };
      data?: Record<string, any>;
      recommendations?: string[];
    }>
  ): Promise<Insight[]> {
    const createdInsights: Insight[] = [];

    for (const insightData of insightsData) {
      try {
        const insight = await this.createInsight({
          ...insightData,
          userId,
        });
        createdInsights.push(insight);
      } catch (error) {
        console.error('Failed to create insight:', error);
        // Continue with other insights even if one fails
      }
    }

    return createdInsights;
  }

  /**
   * Get insights for a specific time period
   */
  async getInsightsForTimePeriod(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Insight[]> {
    return await db
      .select({
        ...insight,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(insight)
      .leftJoin(category, eq(insight.categoryId, category.id))
      .where(
        and(
          eq(insight.userId, userId),
          gte(insight.createdAt, new Date(startDate)),
          lte(insight.createdAt, new Date(endDate))
        )
      )
      .orderBy(desc(insight.createdAt));
  }

  /**
   * Validate insight data
   */
  private validateInsightData(insightData: any): void {
    if (!insightData.title || typeof insightData.title !== 'string') {
      throw new Error('Insight title is required and must be a string');
    }

    if (!insightData.description || typeof insightData.description !== 'string') {
      throw new Error('Insight description is required and must be a string');
    }

    if (!insightData.type || ![
      'spending_trend', 'anomaly', 'cash_flow', 'recommendation',
      'budget_alert', 'goal_progress', 'tax_opportunity'
    ].includes(insightData.type)) {
      throw new Error('Insight type must be one of the valid types');
    }

    if (!insightData.impact || !['low', 'medium', 'high'].includes(insightData.impact)) {
      throw new Error('Insight impact must be low, medium, or high');
    }

    if (insightData.confidence !== undefined && (insightData.confidence < 0 || insightData.confidence > 100)) {
      throw new Error('Confidence must be between 0 and 100');
    }

    const title = insightData.title.trim();
    const description = insightData.description.trim();

    if (title.length < 5) {
      throw new Error('Insight title must be at least 5 characters long');
    }

    if (title.length > 200) {
      throw new Error('Insight title cannot exceed 200 characters');
    }

    if (description.length < 10) {
      throw new Error('Insight description must be at least 10 characters long');
    }

    if (description.length > 1000) {
      throw new Error('Insight description cannot exceed 1000 characters');
    }
  }

  /**
   * Create insight with validation
   */
  async createInsightWithValidation(insightData: {
    type: InsightType;
    title: string;
    description: string;
    confidence: number;
    impact: InsightImpact;
    userId: string;
    categoryId?: string;
    timePeriod?: {
      startDate: string;
      endDate: string;
    };
    data?: Record<string, any>;
    recommendations?: string[];
    isRead?: boolean;
  }): Promise<Insight> {
    this.validateInsightData(insightData);
    return this.createInsight(insightData);
  }
}

// Export singleton instance
export const insightService = new InsightService();