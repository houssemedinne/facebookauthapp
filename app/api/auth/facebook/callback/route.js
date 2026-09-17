import { NextResponse } from 'next/server';

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
  const { FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI, FB_GRAPH_VERSION = 'v26.0' } = process.env;

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
  const pagesParams = new URLSearchParams({
    fields: 'id,name,access_token,category',
    access_token: userToken
  });

  const pagesResponse = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts?${pagesParams}`,
    { cache: 'no-store' }
  );
  const pagesData = await pagesResponse.json();

  if (!pagesResponse.ok) {
    return errorResponse(pagesData.error?.message || 'Could not retrieve the user Pages.');
  }

  const pages = Array.isArray(pagesData.data) ? pagesData.data : [];

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facebook OAuth Result</title>
<style>body{margin:0;background:#f5f7fb;font-family:system-ui,sans-serif;color:#111827}.wrap{max-width:760px;margin:60px auto;padding:24px}.card{background:#fff;border-radius:18px;padding:30px;box-shadow:0 12px 40px rgba(0,0,0,.08)}.ok{color:#166534;background:#dcfce7;padding:12px;border-radius:10px}.page{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:12px}.muted{color:#6b7280}a{color:#1877f2}</style></head>
<body><div class="wrap"><div class="card"><h1>Facebook OAuth succeeded</h1><p class="ok">Authorization code exchanged successfully.</p><h2>Pages returned by Facebook</h2>
${pages.length ? pages.map((page) => `<div class="page"><strong>${page.name ?? 'Unnamed Page'}</strong><div class="muted">Page ID: ${page.id ?? 'unknown'}</div><div>Page access token: ${page.access_token ? 'received ✓' : 'not returned'}</div></div>`).join('') : '<p class="muted">No Pages were returned for this Facebook account.</p>'}
<p class="muted" style="margin-top:24px">User access token: received (${userToken.length} characters). The token itself is not displayed.</p>
<p style="margin-top:24px"><a href="/">Back to test page</a></p></div></div></body></html>`;

  const response = new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
  response.cookies.delete('fb_oauth_state');
  return response;
}
