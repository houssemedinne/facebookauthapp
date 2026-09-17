import { NextResponse } from 'next/server';
import { encryptSession, setSessionCookie } from '../../../../../lib/session';

export const dynamic = 'force-dynamic';

function errorResponse(message, status = 400) {
  return new NextResponse(`Facebook OAuth error: ${message}`, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  const savedState = request.cookies.get('fb_oauth_state')?.value;
  const {
    FB_APP_ID,
    FB_APP_SECRET,
    FB_REDIRECT_URI,
    FB_GRAPH_VERSION = 'v26.0'
  } = process.env;

  if (error) return errorResponse(error);
  if (!code) return errorResponse('No authorization code was returned by Facebook.');
  if (!returnedState || !savedState || returnedState !== savedState) {
    return errorResponse('OAuth state validation failed.', 403);
  }
  if (!FB_APP_ID || !FB_APP_SECRET || !FB_REDIRECT_URI) {
    return errorResponse('OAuth environment variables are not configured.', 500);
  }

  const tokenParams = new URLSearchParams({
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    redirect_uri: FB_REDIRECT_URI,
    code
  });

  const tokenResponse = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token?${tokenParams}`,
    { cache: 'no-store' }
  );
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    return errorResponse(tokenData.error?.message || 'Could not exchange the authorization code.');
  }

  const userToken = tokenData.access_token;
  const meParams = new URLSearchParams({
    fields: 'id,name',
    access_token: userToken
  });

  const meResponse = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/me?${meParams}`,
    { cache: 'no-store' }
  );
  const meData = await meResponse.json();

  if (!meResponse.ok || !meData.id) {
    return errorResponse(meData.error?.message || 'Could not retrieve the Facebook user profile.');
  }

  const sessionValue = await encryptSession({
    userToken,
    user: {
      id: meData.id,
      name: meData.name || 'Facebook user'
    },
    createdAt: Date.now()
  });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  setSessionCookie(response, sessionValue);
  response.cookies.delete('fb_oauth_state');
  return response;
}
