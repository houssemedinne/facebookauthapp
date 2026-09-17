import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/', request.url), 303);
  clearSessionCookie(response);
  return response;
}

export async function GET(request) {
  const response = NextResponse.redirect(new URL('/', request.url), 303);
  clearSessionCookie(response);
  return response;
}
