import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '@/db';
import { insights, NewInsight } from '@/db/schema/finance';

// GET /api/insights - List all insights for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const offset = (page - 1) * limit;

    const whereConditions = [eq(insights.userId, session.user.id)];

    if (unreadOnly) {
      whereConditions.push(eq(insights.isRead, false));
    }

    const [userInsights, totalCount] = await Promise.all([
      db
        .select({
          id: insights.id,
          content: insights.content,
          generatedAt: insights.generatedAt,
          isRead: insights.isRead,
        })
        .from(insights)
        .where(and(...whereConditions))
        .orderBy(desc(insights.generatedAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: insights.id })
        .from(insights)
        .where(and(...whereConditions))
        .then((result) => result.length),
    ]);

    return NextResponse.json({
      insights: userInsights,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/insights - Create a new insight
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({
        error: 'content is required'
      }, { status: 400 });
    }

    const newInsight: NewInsight = {
      userId: session.user.id,
      content,
    };

    const [insight] = await db
      .insert(insights)
      .values(newInsight)
      .returning();

    return NextResponse.json(insight, { status: 201 });

  } catch (error) {
    console.error('Failed to create insight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}