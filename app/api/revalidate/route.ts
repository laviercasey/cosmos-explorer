import 'server-only';

import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'planets',
  'planets-en',
  'planets-ru',
  'missions',
  'missions-en',
  'missions-ru',
  'trajectories',
  'trajectories-en',
  'trajectories-ru',
]);

interface RevalidateBody {
  readonly tag?: unknown;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'Revalidation disabled' }, { status: 503 });
  }
  const provided = request.headers.get('x-revalidate-secret');
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tag = body.tag;
  if (typeof tag !== 'string' || !ALLOWED_TAGS.has(tag)) {
    return NextResponse.json({ error: 'Unknown or missing tag' }, { status: 400 });
  }

  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag });
}
