import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { exportUserData } from '@/lib/services/account';

export const dynamic = 'force-dynamic';

/** Download everything Tickline stores about the signed-in user as JSON. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="tickline-data-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
