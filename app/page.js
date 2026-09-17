export default function Home() {
  const appId = process.env.FB_APP_ID;
  const configured = Boolean(appId && process.env.FB_REDIRECT_URI && process.env.FB_APP_SECRET);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: '100%', maxWidth: 720, background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 12px 40px rgba(0,0,0,.08)' }}>
        <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Vercel + Facebook OAuth</div>
        <h1 style={{ fontSize: 38, margin: '0 0 12px' }}>Facebook Auth Test</h1>
        <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
          This isolated app tests Facebook Login, the OAuth callback, and Page access-token retrieval without changing fcbmanagerapp.
        </p>
        {!configured ? (
          <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: '#fff7ed', color: '#9a3412' }}>
            Configure <b>FB_APP_ID</b>, <b>FB_APP_SECRET</b>, and <b>FB_REDIRECT_URI</b> in Vercel first.
          </div>
        ) : (
          <a href="/api/auth/facebook" style={{ display: 'inline-block', marginTop: 24, padding: '13px 20px', borderRadius: 10, background: '#1877f2', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
            Continue with Facebook
          </a>
        )}
        <p style={{ marginTop: 28, fontSize: 13, color: '#6b7280' }}>
          App ID: {appId ? `${appId.slice(0, 6)}…` : 'not configured'}
        </p>
      </section>
    </main>
  );
}
