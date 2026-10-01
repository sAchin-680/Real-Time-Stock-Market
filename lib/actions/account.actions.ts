'use server';

import { cookies } from 'next/headers';
import { AppError, runAction, type ActionResult } from '@/lib/errors';
import { requireUser } from '@/lib/server/session';
import { deleteUserAndData } from '@/lib/services/account';

/** Deletes the signed-in user's account and all associated data. Requires typing DELETE. */
export async function deleteMyAccount(confirmation: string): Promise<ActionResult<{ deleted: true }>> {
  return runAction('account.delete', async () => {
    if (confirmation !== 'DELETE') throw new AppError('Type DELETE to confirm.');
    const user = await requireUser();
    await deleteUserAndData(user.id);
    const jar = await cookies();
    for (const c of jar.getAll()) if (c.name.includes('better-auth')) jar.delete(c.name);
    return { deleted: true };
  });
}
