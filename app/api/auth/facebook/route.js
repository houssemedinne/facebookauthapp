import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { FB_APP_ID, FB_REDIRECT_URI, FB_GRAPH_VERSION = 'v26.0' } = process.env;

  if (!FB_APP_ID || !FB_REDIRECT_URI) {
    return new NextResponse('Facebook OAuth is not configured.', { status: 500 });
  }

  // The OAuth callback URI is fixed in Meta's app settings. Make sure the
  // state cookie is created on that same origin even when this endpoint is
  // opened through a Vercel deployment URL.
  const requestUrl = new URL(request.url);
  const callbackUrl = new URL(FB_REDIRECT_URI);
  if (requestUrl.origin !== callbackUrl.origin) {
    return NextResponse.redirect(new URL('/api/auth/facebook', callbackUrl.origin));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(new URL('/api/auth/facebook/callback', callbackUrl.origin));
  response.cookies.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/'
  });

  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: FB_REDIRECT_URI,
    state,
    response_type: 'code',
    scope: [
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts'
    ].join(',')
  });

  const loginUrl = `https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth?${params}`;
  response.headers.set('Location', loginUrl);
  return response;
}
