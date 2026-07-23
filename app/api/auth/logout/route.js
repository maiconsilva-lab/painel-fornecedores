import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../lib/authServer';

export async function POST() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
