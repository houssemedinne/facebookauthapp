import { NextResponse } from 'next/server';
import { encryptSession, setSessionCookie } from '../../../../../lib/session';

export const dynamic = 'force-dynamic';

function errorResponse(message, status = 400) {
  return new NextResponse(`Facebook OAuth error: ${message}`, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

async function debugToken(accessToken, appId, appSecret, graphVersion) {
  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`
  });

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/debug_token?${params}`,
    { cache: 'no-store' }
  );
  const data = await response.json();

  if (!response.ok || !data.data) {
    throw new Error(data.error?.message || 'Could not inspect the Facebook access token.');
  }

  return data.data;
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

  let tokenInfo;
  try {
    tokenInfo = await debugToken(userToken, FB_APP_ID, FB_APP_SECRET, FB_GRAPH_VERSION);
  } catch (tokenError) {
    return errorResponse(tokenError.message || 'Could not inspect the Facebook access token.', 502);
  }

  const sessionValue = await encryptSession({
    userToken,
    user: {
      id: meData.id,
      name: meData.name || 'Facebook user'
    },
    token: {
      type: tokenInfo.type || null,
      appId: tokenInfo.app_id || null,
      issuedAt: tokenInfo.issued_at ? tokenInfo.issued_at * 1000 : null,
      expiresAt: tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : null,
      dataAccessExpiresAt: tokenInfo.data_access_expiration_time
        ? tokenInfo.data_access_expiration_time * 1000
        : null,
      isValid: tokenInfo.is_valid === true
    },
    createdAt: Date.now()
  });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  setSessionCookie(response, sessionValue);
  response.cookies.delete('fb_oauth_state');
  return response;
}
