import { db } from '@/db';
import { category, type Category, type NewCategory } from '@/db/schema';
import { eq, and, ilike, inArray, isNull } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

export class CategoryService {
  /**
   * Create a new category
   */
  async createCategory(categoryData: {
    name: string;
    type: 'income' | 'expense';
    description?: string;
    color?: string;
    icon?: string;
    userId: string;
    parentId?: string;
  }): Promise<Category> {
    // Validate category name uniqueness for this user and type
    const existingCategory = await db
      .select()
      .from(category)
      .where(
        and(
          eq(category.name, categoryData.name.trim()),
          eq(category.userId, categoryData.userId),
          eq(category.type, categoryData.type),
          eq(category.deletedAt, null)
        )
      )
      .limit(1);

    if (existingCategory.length > 0) {
      throw new Error(`Category '${categoryData.name}' already exists for ${categoryData.type}s`);
    }

    // Validate parent category if provided
    if (categoryData.parentId) {
      const parentCategory = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.id, categoryData.parentId),
            eq(category.userId, categoryData.userId),
            eq(category.type, categoryData.type),
            eq(category.deletedAt, null)
          )
        )
        .limit(1);

      if (parentCategory.length === 0) {
        throw new Error('Parent category not found or does not match type');
      }
    }

    const newCategory: NewCategory = {
      id: createId(),
      name: categoryData.name.trim(),
      type: categoryData.type,
      description: categoryData.description?.trim() || null,
      color: categoryData.color || this.getDefaultColor(categoryData.type),
      icon: categoryData.icon || this.getDefaultIcon(categoryData.type),
      userId: categoryData.userId,
      parentId: categoryData.parentId || null,
      isSystem: false,
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdCategory] = await db
      .insert(category)
      .values(newCategory)
      .returning();

    return createdCategory;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string, userId: string): Promise<Category | null> {
    const [categoryRecord] = await db
      .select()
      .from(category)
      .where(
        and(
          eq(category.id, categoryId),
          eq(category.userId, userId),
          eq(category.deletedAt, null)
        )
      )
      .limit(1);

    return categoryRecord || null;
  }

  /**
   * Get all categories for a user
   */
  async getUserCategories(
    userId: string,
    type?: 'income' | 'expense',
    includeInactive: boolean = false
  ): Promise<Category[]> {
    const conditions = [
      eq(category.userId, userId),
      eq(category.deletedAt, null)
    ];

    if (type) {
      conditions.push(eq(category.type, type));
    }

    if (!includeInactive) {
      conditions.push(eq(category.isActive, true));
    }

    return await db
      .select()
      .from(category)
      .where(and(...conditions))
      .orderBy(category.name);
  }

  /**
   * Get system default categories
   */
  async getSystemCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    const conditions = [
      isNull(category.userId), // System categories have null userId
      eq(category.deletedAt, null)
    ];

    if (type) {
      conditions.push(eq(category.type, type));
    }

    return await db
      .select()
      .from(category)
      .where(and(...conditions))
      .orderBy(category.name);
  }

  /**
   * Get both user and system categories
   */
  async getAllAvailableCategories(
    userId: string,
    type?: 'income' | 'expense'
  ): Promise<Category[]> {
    const userCategories = await this.getUserCategories(userId, type);
    const systemCategories = await this.getSystemCategories(type);

    // Merge and remove duplicates (by name and type)
    const allCategories = [...userCategories];

    for (const systemCat of systemCategories) {
      const exists = userCategories.some(
        userCat => userCat.name === systemCat.name && userCat.type === systemCat.type
      );
      if (!exists) {
        allCategories.push(systemCat);
      }
    }

    return allCategories.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    userId: string,
    updateData: Partial<Omit<Category, 'id' | 'userId' | 'isSystem' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
  ): Promise<Category> {
    const existingCategory = await this.getCategoryById(categoryId, userId);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // Prevent updating system categories' name and type
    if (existingCategory.isSystem && (updateData.name || updateData.type)) {
      throw new Error('Cannot modify name or type of system categories');
    }

    // If updating name, check for uniqueness
    if (updateData.name && updateData.name !== existingCategory.name) {
      const duplicateCategory = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.name, updateData.name.trim()),
            eq(category.userId, userId),
            eq(category.type, existingCategory.type),
            eq(category.deletedAt, null),
            // Exclude current category from check
            eq(category.id, categoryId)
          )
        )
        .limit(1);

      if (duplicateCategory.length > 0) {
        throw new Error(`Category '${updateData.name}' already exists`);
      }
    }

    const updatedCategory = {
      ...existingCategory,
      ...updateData,
      updatedAt: new Date(),
    };

    const [result] = await db
      .update(category)
      .set(updatedCategory)
      .where(eq(category.id, categoryId))
      .returning();

    return result;
  }

  /**
   * Soft delete category
   */
  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    const existingCategory = await this.getCategoryById(categoryId, userId);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // Prevent deletion of system categories
    if (existingCategory.isSystem) {
      throw new Error('Cannot delete system categories');
    }

    // Check if category has child categories
    const childCategories = await db
      .select()
      .from(category)
      .where(
        and(
          eq(category.parentId, categoryId),
          eq(category.deletedAt, null)
        )
      );

    if (childCategories.length > 0) {
      throw new Error('Cannot delete category with subcategories. Delete subcategories first.');
    }

    await db
      .update(category)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        isActive: false
      })
      .where(eq(category.id, categoryId));
  }

  /**
   * Activate/deactivate category
   */
  async toggleCategoryActive(categoryId: string, userId: string): Promise<Category> {
    const existingCategory = await this.getCategoryById(categoryId, userId);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    const updatedCategory = await this.updateCategory(categoryId, userId, {
      isActive: !existingCategory.isActive
    });

    return updatedCategory;
  }

  /**
   * Search categories by name
   */
  async searchCategories(
    userId: string,
    query: string,
    type?: 'income' | 'expense'
  ): Promise<Category[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    const conditions = [
      eq(category.userId, userId),
      eq(category.deletedAt, null),
      ilike(category.name, searchPattern)
    ];

    if (type) {
      conditions.push(eq(category.type, type));
    }

    return await db
      .select()
      .from(category)
      .where(and(...conditions))
      .orderBy(category.name);
  }

  /**
   * Get category with children
   */
  async getCategoryWithChildren(categoryId: string, userId: string): Promise<{
    category: Category | null;
    children: Category[];
  }> {
    const categoryRecord = await this.getCategoryById(categoryId, userId);

    if (!categoryRecord) {
      return { category: null, children: [] };
    }

    const children = await db
      .select()
      .from(category)
      .where(
        and(
          eq(category.parentId, categoryId),
          eq(category.deletedAt, null)
        )
      )
      .orderBy(category.name);

    return { category: categoryRecord, children };
  }

  /**
   * Get category tree for a user
   */
  async getCategoryTree(userId: string, type?: 'income' | 'expense'): Promise<Category[]> {
    const allCategories = await this.getUserCategories(userId, type);

    // Create a map for quick lookup
    const categoryMap = new Map(allCategories.map(cat => [cat.id, { ...cat, children: [] }]));

    // Separate root categories and children
    const rootCategories: Category[] = [];

    allCategories.forEach(cat => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(categoryMap.get(cat.id)!);
      } else {
        rootCategories.push(categoryMap.get(cat.id)!);
      }
    });

    return rootCategories;
  }

  /**
   * Bulk create default system categories
   */
  async createSystemCategories(): Promise<void> {
    const defaultIncomeCategories = [
      { name: 'Service Revenue', description: 'Income from services provided' },
      { name: 'Product Sales', description: 'Income from product sales' },
      { name: 'Investment Income', description: 'Income from investments' },
      { name: 'Interest Income', description: 'Interest earned' },
      { name: 'Rental Income', description: 'Income from property rentals' },
      { name: 'Commission Income', description: 'Commission earned' },
      { name: 'Consulting Fees', description: 'Fees from consulting work' },
      { name: 'Other Income', description: 'Other sources of income' },
    ];

    const defaultExpenseCategories = [
      { name: 'Office Supplies', description: 'Office and administrative supplies' },
      { name: 'Software & Subscriptions', description: 'Software licenses and subscriptions' },
      { name: 'Marketing & Advertising', description: 'Marketing and advertising expenses' },
      { name: 'Travel & Meals', description: 'Business travel and meals' },
      { name: 'Utilities', description: 'Utilities and services' },
      { name: 'Rent & Lease', description: 'Rent and lease payments' },
      { name: 'Insurance', description: 'Insurance premiums' },
      { name: 'Professional Services', description: 'Professional fees and services' },
      { name: 'Equipment', description: 'Equipment and hardware purchases' },
      { name: 'Maintenance & Repairs', description: 'Maintenance and repair costs' },
      { name: 'Banking Fees', description: 'Bank and processing fees' },
      { name: 'Training & Education', description: 'Training and education expenses' },
      { name: 'Entertainment', description: 'Business entertainment' },
      { name: 'Supplies', description: 'Business supplies' },
      { name: 'Taxes', description: 'Tax payments' },
      { name: 'Payroll', description: 'Employee salaries and wages' },
      { name: 'Other Expenses', description: 'Other business expenses' },
    ];

    const systemUserId = 'system'; // Special user ID for system categories

    // Create income categories
    for (const catData of defaultIncomeCategories) {
      const exists = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.name, catData.name),
            eq(category.userId, systemUserId),
            eq(category.type, 'income'),
            eq(category.isSystem, true)
          )
        )
        .limit(1);

      if (exists.length === 0) {
        await db.insert(category).values({
          id: createId(),
          name: catData.name,
          type: 'income',
          description: catData.description,
          color: this.getDefaultColor('income'),
          icon: this.getDefaultIcon('income'),
          userId: systemUserId,
          parentId: null,
          isSystem: true,
          isActive: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Create expense categories
    for (const catData of defaultExpenseCategories) {
      const exists = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.name, catData.name),
            eq(category.userId, systemUserId),
            eq(category.type, 'expense'),
            eq(category.isSystem, true)
          )
        )
        .limit(1);

      if (exists.length === 0) {
        await db.insert(category).values({
          id: createId(),
          name: catData.name,
          type: 'expense',
          description: catData.description,
          color: this.getDefaultColor('expense'),
          icon: this.getDefaultIcon('expense'),
          userId: systemUserId,
          parentId: null,
          isSystem: true,
          isActive: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(userId: string): Promise<{
    totalCategories: number;
    incomeCategories: number;
    expenseCategories: number;
    activeCategories: number;
    inactiveCategories: number;
    customCategories: number;
    systemCategoriesAvailable: number;
  }> {
    const [userCategories, systemCategories] = await Promise.all([
      this.getUserCategories(userId, undefined, true),
      this.getSystemCategories()
    ]);

    const activeCategories = userCategories.filter(cat => cat.isActive);
    const customCategories = userCategories.filter(cat => !cat.isSystem);

    return {
      totalCategories: userCategories.length,
      incomeCategories: userCategories.filter(cat => cat.type === 'income').length,
      expenseCategories: userCategories.filter(cat => cat.type === 'expense').length,
      activeCategories: activeCategories.length,
      inactiveCategories: userCategories.length - activeCategories.length,
      customCategories: customCategories.length,
      systemCategoriesAvailable: systemCategories.length,
    };
  }

  /**
   * Get default color for category type
   */
  private getDefaultColor(type: 'income' | 'expense'): string {
    const colors = {
      income: '#22C55E', // Green
      expense: '#EF4444', // Red
    };
    return colors[type];
  }

  /**
   * Get default icon for category type
   */
  private getDefaultIcon(type: 'income' | 'expense'): string {
    const icons = {
      income: 'trending-up',
      expense: 'trending-down',
    };
    return icons[type];
  }

  /**
   * Validate category data
   */
  private validateCategoryData(categoryData: any): void {
    if (!categoryData.name || typeof categoryData.name !== 'string') {
      throw new Error('Category name is required and must be a string');
    }

    if (!categoryData.type || !['income', 'expense'].includes(categoryData.type)) {
      throw new Error('Category type must be either "income" or "expense"');
    }

    if (categoryData.name.trim().length < 2) {
      throw new Error('Category name must be at least 2 characters long');
    }

    if (categoryData.name.trim().length > 50) {
      throw new Error('Category name cannot exceed 50 characters');
    }

    if (categoryData.description && categoryData.description.length > 200) {
      throw new Error('Category description cannot exceed 200 characters');
    }

    if (categoryData.color && !/^#[0-9A-F]{6}$/i.test(categoryData.color)) {
      throw new Error('Color must be a valid hex color code');
    }
  }

  /**
   * Create category with validation
   */
  async createCategoryWithValidation(categoryData: {
    name: string;
    type: 'income' | 'expense';
    description?: string;
    color?: string;
    icon?: string;
    userId: string;
    parentId?: string;
  }): Promise<Category> {
    this.validateCategoryData(categoryData);
    return this.createCategory(categoryData);
  }
}

// Export singleton instance
export const categoryService = new CategoryService();