import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/category-service';
import { logApiAccess } from '@/lib/middleware/auth';
import { auditService } from '@/lib/services/audit-service';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/categories - Get user's categories
export async function GET(request: NextRequest) {
  try {
    // Validate session using Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'income' | 'expense' | undefined;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeSystem = searchParams.get('includeSystem') !== 'false'; // Default to true

    let categories;

    if (includeSystem) {
      categories = await categoryService.getAllAvailableCategories(session.user.id, type);
    } else {
      categories = await categoryService.getUserCategories(session.user.id, type, includeInactive);
    }

    // Log the read operation
    await auditService.createAuditLog({
      userId: session.user.id,
      entityType: 'category',
      entityId: 'batch',
      action: 'read',
      oldValue: null,
      newValue: {
        type,
        includeInactive,
        includeSystem,
        resultCount: categories.length,
      },
      reason: 'User retrieved categories',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Log API access
    await logApiAccess(request, session.user.id, 'categories', 'list', 'GET', true);

    return NextResponse.json({
      categories,
      total: categories.length,
      type,
      includeInactive,
      includeSystem,
    });

  } catch (error) {
    console.error('Get categories error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const categoryData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'type'];
    for (const field of requiredFields) {
      if (!categoryData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate category type
    if (!['income', 'expense'].includes(categoryData.type)) {
      return NextResponse.json(
        { error: 'Category type must be either "income" or "expense"' },
        { status: 400 }
      );
    }

    // Validate name length
    if (categoryData.name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Category name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (categoryData.name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Category name cannot exceed 50 characters' },
        { status: 400 }
      );
    }

    // Validate color if provided
    if (categoryData.color && !/^#[0-9A-F]{6}$/i.test(categoryData.color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color code' },
        { status: 400 }
      );
    }

    // Validate description length if provided
    if (categoryData.description && categoryData.description.length > 200) {
      return NextResponse.json(
        { error: 'Category description cannot exceed 200 characters' },
        { status: 400 }
      );
    }

    // Create category
    const category = await categoryService.createCategoryWithValidation({
      name: categoryData.name.trim(),
      type: categoryData.type,
      description: categoryData.description?.trim(),
      color: categoryData.color,
      icon: categoryData.icon,
      userId,
      parentId: categoryData.parentId,
    });

    // Log the creation
    await auditService.createAuditLog({
      userId,
      entityType: 'category',
      entityId: category.id,
      action: 'create',
      oldValue: null,
      newValue: {
        name: category.name,
        type: category.type,
        description: category.description,
        color: category.color,
        icon: category.icon,
        parentId: category.parentId,
      },
      reason: 'User created a new category',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Log API access
    await logApiAccess(request, session.user.id, 'categories', 'create', 'POST', true);

    return NextResponse.json({
      category,
      message: 'Category created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create category error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('already exists') ||
          error.message.includes('not found') ||
          error.message.includes('required') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}