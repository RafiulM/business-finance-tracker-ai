import { db } from '@/db';
import {
  asset,
  type Asset,
  type NewAsset,
  type AssetType,
  type AssetStatus
} from '@/db/schema';
import { eq, and, desc, asc, gte, lte, ilike } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

export class AssetService {
  /**
   * Create a new asset
   */
  async createAsset(assetData: {
    name: string;
    type: AssetType;
    currentValue: number;
    purchaseValue?: number;
    purchaseDate?: string;
    currency?: string;
    description?: string;
    location?: string;
    metadata?: Record<string, any>;
    userId: string;
  }): Promise<Asset> {
    // Validate amount
    if (assetData.currentValue <= 0) {
      throw new Error('Asset value must be greater than 0');
    }

    // Validate purchase value if provided
    if (assetData.purchaseValue !== undefined && assetData.purchaseValue <= 0) {
      throw new Error('Purchase value must be greater than 0');
    }

    // Validate dates if provided
    if (assetData.purchaseDate) {
      const purchaseDate = new Date(assetData.purchaseDate);
      if (isNaN(purchaseDate.getTime())) {
        throw new Error('Invalid purchase date');
      }

      const today = new Date();
      if (purchaseDate > today) {
        throw new Error('Purchase date cannot be in the future');
      }
    }

    const newAsset: NewAsset = {
      id: createId(),
      name: assetData.name.trim(),
      type: assetData.type,
      currentValue: assetData.currentValue,
      purchaseValue: assetData.purchaseValue || null,
      purchaseDate: assetData.purchaseDate ? new Date(assetData.purchaseDate) : null,
      currency: assetData.currency || 'USD',
      description: assetData.description?.trim() || null,
      location: assetData.location?.trim() || null,
      status: 'active' as AssetStatus,
      lastValuationDate: new Date(),
      metadata: assetData.metadata || {},
      userId: assetData.userId,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdAsset] = await db
      .insert(asset)
      .values(newAsset)
      .returning();

    return createdAsset;
  }

  /**
   * Get asset by ID
   */
  async getAssetById(assetId: string, userId: string): Promise<Asset | null> {
    const [assetRecord] = await db
      .select()
      .from(asset)
      .where(
        and(
          eq(asset.id, assetId),
          eq(asset.userId, userId),
          eq(asset.deletedAt, null)
        )
      )
      .limit(1);

    return assetRecord || null;
  }

  /**
   * Get all assets for a user
   */
  async getUserAssets(
    userId: string,
    options: {
      type?: AssetType;
      status?: AssetStatus;
      search?: string;
      sortBy?: 'name' | 'currentValue' | 'purchaseDate' | 'lastValuationDate';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<Asset[]> {
    const {
      type,
      status,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    // Build conditions
    const conditions = [
      eq(asset.userId, userId),
      eq(asset.deletedAt, null)
    ];

    if (type) {
      conditions.push(eq(asset.type, type));
    }

    if (status) {
      conditions.push(eq(asset.status, status));
    }

    if (search) {
      conditions.push(ilike(asset.name, `%${search.toLowerCase()}%`));
    }

    // Build order by
    let orderBy;
    if (sortBy === 'name') {
      orderBy = sortOrder === 'asc' ? asc(asset.name) : desc(asset.name);
    } else if (sortBy === 'currentValue') {
      orderBy = sortOrder === 'asc' ? asc(asset.currentValue) : desc(asset.currentValue);
    } else if (sortBy === 'purchaseDate') {
      orderBy = sortOrder === 'asc' ? asc(asset.purchaseDate) : desc(asset.purchaseDate);
    } else if (sortBy === 'lastValuationDate') {
      orderBy = sortOrder === 'asc' ? asc(asset.lastValuationDate) : desc(asset.lastValuationDate);
    } else {
      orderBy = asc(asset.name);
    }

    return await db
      .select()
      .from(asset)
      .where(and(...conditions))
      .orderBy(orderBy);
  }

  /**
   * Update asset
   */
  async updateAsset(
    assetId: string,
    userId: string,
    updateData: Partial<Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
  ): Promise<Asset> {
    const existingAsset = await this.getAssetById(assetId, userId);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    // Validate values if provided
    if (updateData.currentValue !== undefined && updateData.currentValue <= 0) {
      throw new Error('Asset value must be greater than 0');
    }

    if (updateData.purchaseValue !== undefined && updateData.purchaseValue <= 0) {
      throw new Error('Purchase value must be greater than 0');
    }

    // Validate dates if provided
    if (updateData.purchaseDate) {
      const purchaseDate = new Date(updateData.purchaseDate);
      if (isNaN(purchaseDate.getTime())) {
        throw new Error('Invalid purchase date');
      }

      const today = new Date();
      if (purchaseDate > today) {
        throw new Error('Purchase date cannot be in the future');
      }
    }

    // Update last valuation date if value changed
    const finalUpdateData = {
      ...updateData,
      lastValuationDate: updateData.currentValue ? new Date() : existingAsset.lastValuationDate,
      updatedAt: new Date(),
    };

    const [updatedAsset] = await db
      .update(asset)
      .set(finalUpdateData)
      .where(eq(asset.id, assetId))
      .returning();

    return updatedAsset;
  }

  /**
   * Update asset value
   */
  async updateAssetValue(
    assetId: string,
    userId: string,
    newValue: number,
    valuationDate?: string
  ): Promise<Asset> {
    const existingAsset = await this.getAssetById(assetId, userId);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    if (newValue <= 0) {
      throw new Error('Asset value must be greater than 0');
    }

    const updatedAsset = await this.updateAsset(assetId, userId, {
      currentValue: newValue,
      lastValuationDate: valuationDate ? new Date(valuationDate) : new Date(),
    });

    return updatedAsset;
  }

  /**
   * Soft delete asset
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const existingAsset = await this.getAssetById(assetId, userId);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    await db
      .update(asset)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(asset.id, assetId));
  }

  /**
   * Change asset status
   */
  async changeAssetStatus(
    assetId: string,
    userId: string,
    status: AssetStatus
  ): Promise<Asset> {
    const existingAsset = await this.getAssetById(assetId, userId);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    const updatedAsset = await this.updateAsset(assetId, userId, {
      status,
    });

    return updatedAsset;
  }

  /**
   * Get asset statistics
   */
  async getAssetStats(userId: string): Promise<{
    totalAssets: number;
    totalValue: number;
    totalPurchaseValue: number;
    totalGainLoss: number;
    percentageGainLoss: number;
    assetsByType: Array<{
      type: AssetType;
      count: number;
      totalValue: number;
      percentageOfTotal: number;
    }>;
    assetsByStatus: Array<{
      status: AssetStatus;
      count: number;
      totalValue: number;
    }>;
    mostValuableAssets: Array<{
      id: string;
      name: string;
      type: AssetType;
      value: number;
    }>;
  }> {
    const assets = await this.getUserAssets(userId);

    if (assets.length === 0) {
      return {
        totalAssets: 0,
        totalValue: 0,
        totalPurchaseValue: 0,
        totalGainLoss: 0,
        percentageGainLoss: 0,
        assetsByType: [],
        assetsByStatus: [],
        mostValuableAssets: [],
      };
    }

    const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalPurchaseValue = assets
      .filter(asset => asset.purchaseValue !== null)
      .reduce((sum, asset) => sum + (asset.purchaseValue || 0), 0);

    const totalGainLoss = totalValue - totalPurchaseValue;
    const percentageGainLoss = totalPurchaseValue > 0 ? (totalGainLoss / totalPurchaseValue) * 100 : 0;

    // Group by type
    const typeMap = new Map<AssetType, { count: number; totalValue: number }>();

    assets.forEach(asset => {
      if (!typeMap.has(asset.type)) {
        typeMap.set(asset.type, { count: 0, totalValue: 0 });
      }
      const typeData = typeMap.get(asset.type)!;
      typeData.count++;
      typeData.totalValue += asset.currentValue;
    });

    const assetsByType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      totalValue: data.totalValue,
      percentageOfTotal: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
    }));

    // Group by status
    const statusMap = new Map<AssetStatus, { count: number; totalValue: number }>();

    assets.forEach(asset => {
      if (!statusMap.has(asset.status)) {
        statusMap.set(asset.status, { count: 0, totalValue: 0 });
      }
      const statusData = statusMap.get(asset.status)!;
      statusData.count++;
      statusData.totalValue += asset.currentValue;
    });

    const assetsByStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      totalValue: data.totalValue,
    }));

    // Get most valuable assets
    const mostValuableAssets = assets
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5)
      .map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        value: asset.currentValue,
      }));

    return {
      totalAssets: assets.length,
      totalValue,
      totalPurchaseValue,
      totalGainLoss,
      percentageGainLoss,
      assetsByType,
      assetsByStatus,
      mostValuableAssets,
    };
  }

  /**
   * Search assets
   */
  async searchAssets(
    userId: string,
    query: string,
    limit: number = 50
  ): Promise<Asset[]> {
    return await db
      .select()
      .from(asset)
      .where(
        and(
          eq(asset.userId, userId),
          ilike(asset.name, `%${query.toLowerCase()}%`),
          eq(asset.deletedAt, null)
        )
      )
      .orderBy(desc(asset.currentValue))
      .limit(limit);
  }

  /**
   * Get assets by type
   */
  async getAssetsByType(
    userId: string,
    type: AssetType
  ): Promise<Asset[]> {
    return await db
      .select()
      .from(asset)
      .where(
        and(
          eq(asset.userId, userId),
          eq(asset.type, type),
          eq(asset.deletedAt, null)
        )
      )
      .orderBy(desc(asset.currentValue));
  }

  /**
   * Get assets that need valuation
   */
  async getAssetsNeedingValuation(
    userId: string,
    daysSinceLastValuation: number = 90
  ): Promise<Asset[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastValuation);

    return await db
      .select()
      .from(asset)
      .where(
        and(
          eq(asset.userId, userId),
          eq(asset.status, 'active'),
          eq(asset.deletedAt, null),
          // Assets not valued in the last X days or never valued
          `(last_valuation_date < ${cutoffDate.toISOString()} OR last_valuation_date IS NULL)`
        )
      )
      .orderBy(asc(asset.lastValuationDate));
  }

  /**
   * Get assets performance data
   */
  async getAssetsPerformance(userId: string): Promise<Array<{
    assetId: string;
    name: string;
    type: AssetType;
    purchaseValue: number;
    currentValue: number;
    gainLoss: number;
    percentageGainLoss: number;
    daysOwned: number;
    annualizedReturn: number;
  }>> {
    const assets = await this.getUserAssets(userId);
    const today = new Date();

    return assets
      .filter(asset => asset.purchaseValue !== null && asset.purchaseDate !== null)
      .map(asset => {
        const purchaseValue = asset.purchaseValue!;
        const currentValue = asset.currentValue;
        const gainLoss = currentValue - purchaseValue;
        const percentageGainLoss = (gainLoss / purchaseValue) * 100;

        const daysOwned = Math.floor(
          (today.getTime() - new Date(asset.purchaseDate!).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate annualized return
        const yearsOwned = daysOwned / 365.25;
        const annualizedReturn = yearsOwned > 0
          ? (Math.pow(currentValue / purchaseValue, 1 / yearsOwned) - 1) * 100
          : 0;

        return {
          assetId: asset.id,
          name: asset.name,
          type: asset.type,
          purchaseValue,
          currentValue,
          gainLoss,
          percentageGainLoss,
          daysOwned,
          annualizedReturn,
        };
      })
      .sort((a, b) => b.percentageGainLoss - a.percentageGainLoss);
  }

  /**
   * Bulk update asset values
   */
  async bulkUpdateAssetValues(
    updates: Array<{
      assetId: string;
      newValue: number;
      valuationDate?: string;
    }>,
    userId: string
  ): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    // Verify all assets belong to user
    const assetIds = updates.map(u => u.assetId);
    const userAssets = await db
      .select()
      .from(asset)
      .where(
        and(
          eq(asset.userId, userId),
          eq(asset.deletedAt, null)
        )
      );

    const userAssetIds = userAssets.map(a => a.id);
    const invalidAssetIds = assetIds.filter(id => !userAssetIds.includes(id));

    if (invalidAssetIds.length > 0) {
      throw new Error('Some assets not found or do not belong to user');
    }

    let updatedCount = 0;

    for (const update of updates) {
      try {
        await this.updateAssetValue(update.assetId, userId, update.newValue, update.valuationDate);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update asset ${update.assetId}:`, error);
      }
    }

    return updatedCount;
  }

  /**
   * Get asset valuation history placeholder
   * (In a real implementation, this would track valuation history in a separate table)
   */
  async getAssetValuationHistory(assetId: string, userId: string): Promise<Array<{
    date: string;
    value: number;
    source: string;
  }>> {
    const assetRecord = await this.getAssetById(assetId, userId);
    if (!assetRecord) {
      throw new Error('Asset not found');
    }

    // Return mock history - in reality, this would come from a valuation history table
    const history = [];

    if (assetRecord.purchaseDate && assetRecord.purchaseValue) {
      history.push({
        date: assetRecord.purchaseDate.toISOString().split('T')[0],
        value: assetRecord.purchaseValue,
        source: 'purchase',
      });
    }

    history.push({
      date: assetRecord.lastValuationDate.toISOString().split('T')[0],
      value: assetRecord.currentValue,
      source: 'current',
    });

    return history;
  }

  /**
   * Validate asset data
   */
  private validateAssetData(assetData: any): void {
    if (!assetData.name || typeof assetData.name !== 'string') {
      throw new Error('Asset name is required and must be a string');
    }

    if (!assetData.type || ![
      'real_estate', 'vehicle', 'equipment', 'investment', 'cash', 'other'
    ].includes(assetData.type)) {
      throw new Error('Asset type must be one of: real_estate, vehicle, equipment, investment, cash, other');
    }

    if (!assetData.currentValue || typeof assetData.currentValue !== 'number' || assetData.currentValue <= 0) {
      throw new Error('Current value is required and must be greater than 0');
    }

    const name = assetData.name.trim();
    if (name.length < 2) {
      throw new Error('Asset name must be at least 2 characters long');
    }

    if (name.length > 100) {
      throw new Error('Asset name cannot exceed 100 characters');
    }

    if (assetData.currentValue > 999999999999) {
      throw new Error('Asset value is too large');
    }

    if (assetData.purchaseValue !== undefined && assetData.purchaseValue > 999999999999) {
      throw new Error('Purchase value is too large');
    }
  }

  /**
   * Create asset with validation
   */
  async createAssetWithValidation(assetData: {
    name: string;
    type: AssetType;
    currentValue: number;
    purchaseValue?: number;
    purchaseDate?: string;
    currency?: string;
    description?: string;
    location?: string;
    metadata?: Record<string, any>;
    userId: string;
  }): Promise<Asset> {
    this.validateAssetData(assetData);
    return this.createAsset(assetData);
  }
}

// Export singleton instance
export const assetService = new AssetService();