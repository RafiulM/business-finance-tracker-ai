import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { insights } from '@/db/schema/finance';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/insights/[id]/read - Mark an insight as read
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [updatedInsight] = await db
      .update(insights)
      .set({ isRead: true })
      .where(and(
        eq(insights.id, id),
        eq(insights.userId, session.user.id)
      ))
      .returning();

    if (!updatedInsight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to mark insight as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}