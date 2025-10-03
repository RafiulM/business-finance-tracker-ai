import { db } from '@/db';
import { user, auditLog, type User, type AuditLog } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

export class UserService {
  /**
   * Create a new user with validation
   */
  async createUser(userData: {
    email: string;
    name: string;
    password: string;
    businessName?: string;
    baseCurrency?: string;
    timezone?: string;
    preferences?: User['preferences'];
  }): Promise<User> {
    // Validate email uniqueness
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Create user object
    const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      email: userData.email.toLowerCase(),
      name: userData.name.trim(),
      businessName: userData.businessName?.trim() || null,
      baseCurrency: userData.baseCurrency || 'USD',
      timezone: userData.timezone || 'UTC',
      preferences: userData.preferences || {
        defaultCategories: [],
        notificationSettings: { email: true, push: false },
        dashboardLayout: { showCharts: true, showTable: true },
        aiAssistanceEnabled: true,
      },
      emailVerified: false,
      image: null,
      deletedAt: null,
    };

    const [createdUser] = await db
      .insert(user)
      .values({
        ...newUser,
        id: createId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create audit log entry
    await this.createAuditLog(createdUser.id, 'user', createdUser.id, 'create', null, {
      email: createdUser.email,
      name: createdUser.name,
      businessName: createdUser.businessName,
    });

    return createdUser;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, userId), eq(user.deletedAt, null)))
      .limit(1);

    return userRecord || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(and(eq(user.email, email.toLowerCase()), eq(user.deletedAt, null)))
      .limit(1);

    return userRecord || null;
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updateData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified'>>,
    auditReason?: string
  ): Promise<User> {
      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      const updatedUser = {
        ...currentUser,
        ...updateData,
        updatedAt: new Date(),
      };

      const [result] = await db
        .update(user)
        .set(updatedUser)
        .where(eq(user.id, userId))
        .returning();

      // Create audit log entry
      await this.createAuditLog(userId, 'user', userId, 'update', null, updateData, auditReason);

      return result;
  }

  /**
   * Soft delete user
   */
  async softDeleteUser(userId: string, reason?: string): Promise<void> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    await db
      .update(user)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(user.id, userId));

    // Create audit log entry
    await this.createAuditLog(userId, 'user', userId, 'delete', null, {
      deletedAt: new Date(),
    }, reason);
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<User> {
    const updatedUser = await this.updateUser(userId, { emailVerified: true });

    // Create audit log entry
    await this.createAuditLog(userId, 'user', userId, 'update', null, {
      emailVerified: true,
    }, 'Email verification completed');

    return updatedUser;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: User['preferences']
  ): Promise<User> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const newPreferences = {
      ...currentUser.preferences,
      ...preferences,
    };

    const updatedUser = await this.updateUser(userId, { preferences: newPreferences });

    // Create audit log entry
    await this.createAuditLog(userId, 'user', userId, 'update', null, {
      preferences: newPreferences,
    }, 'User preferences updated');

    return updatedUser;
  }

  /**
   * Get user's recent activity (audit log)
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditLog['action'],
    oldValue: any = null,
    newValue: any = null,
    reason?: string
  ): Promise<void> {
    await db.insert(auditLog).values({
      id: createId(),
      userId,
      entityType,
      entityId,
      action,
      oldValue,
      newValue,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Search users by business name or name
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const searchPattern = `%${query.toLowerCase()}%`;

    return await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.deletedAt, null),
          // Search in name, businessName, and email
          `(
            LOWER(${user.name}) LIKE ${searchPattern} OR
            LOWER(${user.businessName}) LIKE ${searchPattern} OR
            LOWER(${user.email}) LIKE ${searchPattern}
          )`
        )
      )
      .orderBy(desc(user.createdAt))
      .limit(limit);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    accountAge: number;
    lastActivity: Date | null;
  }> {
    // This would require joining with transactions table
    // For now, return basic stats
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const activity = await this.getUserActivity(userId, 1);
    const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    return {
      totalTransactions: 0, // TODO: Implement when transactions are available
      totalIncome: 0, // TODO: Implement when transactions are available
      totalExpenses: 0, // TODO: Implement when transactions are available
      accountAge,
      lastActivity: activity.length > 0 ? activity[0].timestamp : null,
    };
  }

  /**
   * Validate user data
   */
  private validateUserData(userData: any): void {
    if (!userData.email || typeof userData.email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    if (!userData.name || typeof userData.name !== 'string') {
      throw new Error('Name is required and must be a string');
    }

    if (!userData.password || typeof userData.password !== 'string') {
      throw new Error('Password is required and must be a string');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Password strength validation
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(userData.password) ||
        !/(?=.*[A-Z])/.test(userData.password) ||
        !/(?=.*\d)/.test(userData.password)) {
      throw new Error('Password must contain uppercase, lowercase, and numbers');
    }

    // Name validation
    if (userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    // Currency validation (if provided)
    if (userData.baseCurrency && !/^[A-Z]{3}$/.test(userData.baseCurrency)) {
      throw new Error('Base currency must be a valid 3-letter currency code');
    }
  }

  /**
   * Create user with validation
   */
  async createUserWithValidation(userData: {
    email: string;
    name: string;
    password: string;
    businessName?: string;
    baseCurrency?: string;
    timezone?: string;
    preferences?: User['preferences'];
  }): Promise<User> {
      this.validateUserData(userData);
      return this.createUser(userData);
  }
}

// Export singleton instance
export const userService = new UserService();