import { NextRequest, NextResponse } from 'next/server';
import { insightService } from '@/lib/services/insight-service';
import { validateSession } from '@/lib/middleware/auth';

// PUT /api/insights/[id] - Update insight (mark as read, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const insightId = params.id;
    const updateData = await request.json();

    // Validate insight exists and belongs to user
    const existingInsight = await insightService.getInsightById(insightId, userId);
    if (!existingInsight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    // Update insight
    const updatedInsight = await insightService.updateInsight(
      insightId,
      userId,
      updateData
    );

    return NextResponse.json({
      insight: updatedInsight,
      message: 'Insight updated successfully',
    });

  } catch (error) {
    console.error('Update insight error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Insight not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/insights/[id] - Delete insight
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const insightId = params.id;

    // Validate insight exists and belongs to user
    const existingInsight = await insightService.getInsightById(insightId, userId);
    if (!existingInsight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    // Delete insight
    await insightService.deleteInsight(insightId, userId);

    return NextResponse.json({
      message: 'Insight deleted successfully',
    });

  } catch (error) {
    console.error('Delete insight error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Insight not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}