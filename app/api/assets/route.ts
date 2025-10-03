import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { assets, NewAsset } from '@/db/schema/finance';

// GET /api/assets - List all assets for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAssets = await db
      .select({
        id: assets.id,
        name: assets.name,
        type: assets.type,
        initialValue: assets.initialValue,
        currentValue: assets.currentValue,
        acquisitionDate: assets.acquisitionDate,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .where(eq(assets.userId, session.user.id))
      .orderBy(desc(assets.createdAt));

    return NextResponse.json({ assets: userAssets });

  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/assets - Create a new asset
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, initialValue, currentValue, acquisitionDate } = body;

    if (!name || !initialValue || !acquisitionDate) {
      return NextResponse.json({
        error: 'name, initialValue, and acquisitionDate are required'
      }, { status: 400 });
    }

    const newAsset: NewAsset = {
      userId: session.user.id,
      name,
      type: type || 'Other',
      initialValue: initialValue.toString(),
      currentValue: currentValue ? currentValue.toString() : initialValue.toString(),
      acquisitionDate,
    };

    const [asset] = await db
      .insert(assets)
      .values(newAsset)
      .returning();

    return NextResponse.json(asset, { status: 201 });

  } catch (error) {
    console.error('Failed to create asset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}