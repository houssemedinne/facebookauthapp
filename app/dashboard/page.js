import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decryptSession, SESSION_COOKIE } from '../../lib/session';

export const dynamic = 'force-dynamic';

function formatDate(timestamp) {
  if (!timestamp) return 'Not provided by Facebook';
  return new Date(timestamp).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZoneName: 'short'
  });
}

function formatRemaining(expiresAt) {
  if (!expiresAt) return 'No expiration reported';
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return 'Expired';

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days > 0 ? `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} remaining` : `${hours} hour${hours === 1 ? '' : 's'} remaining`;
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const encryptedSession = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(encryptedSession);

  if (!session?.userToken || !session?.user?.id) {
    redirect('/');
  }

  const graphVersion = process.env.FB_GRAPH_VERSION || 'v26.0';
  const pagesParams = new URLSearchParams({
    fields: 'id,name,category',
    access_token: session.userToken
  });

  let pages = [];
  let pagesError = '';

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/me/accounts?${pagesParams}`,
      { cache: 'no-store' }
    );
    const data = await response.json();

    if (!response.ok) {
      pagesError = data.error?.message || 'Could not load Facebook Pages.';
    } else {
      pages = Array.isArray(data.data) ? data.data : [];
    }
  } catch {
    pagesError = 'Could not connect to Facebook to load Pages.';
  }

  const token = session.token || {};
  const tokenType = token.type || 'Unknown';
  const tokenStatus = token.isValid === false ? 'Invalid' : 'Valid';
  const tokenStatusStyle = tokenStatus === 'Valid' ? styles.tokenValid : styles.tokenInvalid;

  return (
    <main style={styles.main}>
      <section style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Facebook connection</div>
            <h1 style={styles.title}>Facebook Connected</h1>
          </div>
          <div style={styles.status}>
            <span style={styles.dot}>●</span> Connected
          </div>
        </div>

        <div style={styles.profileCard}>
          <div style={styles.avatar}>{(session.user.name || 'F')[0].toUpperCase()}</div>
          <div>
            <div style={styles.name}>{session.user.name}</div>
            <div style={styles.muted}>Facebook User ID: {session.user.id}</div>
          </div>
        </div>

        <div style={styles.accessCard}>
          <div style={styles.check}>✓</div>
          <div>
            <strong>Access granted</strong>
            <div style={styles.muted}>Facebook authentication completed successfully.</div>
          </div>
        </div>

        <div style={styles.tokenCard}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Access Token</h2>
            <span style={tokenStatusStyle}>{tokenStatus}</span>
          </div>
          <div style={styles.tokenGrid}>
            <div><div style={styles.label}>Token type</div><strong>{tokenType}</strong></div>
            <div><div style={styles.label}>Issued</div><strong>{formatDate(token.issuedAt)}</strong></div>
            <div><div style={styles.label}>Expires</div><strong>{formatDate(token.expiresAt)}</strong></div>
            <div><div style={styles.label}>Lifetime</div><strong>{formatRemaining(token.expiresAt)}</strong></div>
            <div><div style={styles.label}>Data access expiration</div><strong>{formatDate(token.dataAccessExpiresAt)}</strong></div>
          </div>
          <div style={styles.tokenNote}>The access token itself is never displayed in the dashboard.</div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Pages</h2>
            <span style={styles.count}>{pages.length}</span>
          </div>

          {pagesError ? (
            <div style={styles.warning}>{pagesError}</div>
          ) : pages.length ? (
            pages.map((page) => (
              <div key={page.id} style={styles.page}>
                <div style={styles.pageIcon}>{(page.name || 'P')[0].toUpperCase()}</div>
                <div>
                  <strong>{page.name || 'Unnamed Page'}</strong>
                  <div style={styles.muted}>Page ID: {page.id}</div>
                  {page.category ? <div style={styles.muted}>{page.category}</div> : null}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.empty}>No Facebook Pages were returned for this account.</div>
          )}
        </div>

        <div style={styles.footer}>
          <form action="/api/auth/facebook/disconnect" method="post">
            <button type="submit" style={styles.disconnect}>Disconnect Facebook</button>
          </form>
          <a href="/" style={styles.back}>Back to home</a>
        </div>
      </section>
    </main>
  );
}

const styles = {
  main: { minHeight: '100vh', background: '#f5f7fb', padding: '48px 20px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111827' },
  container: { maxWidth: 820, margin: '0 auto', background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 16px 50px rgba(0,0,0,.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' },
  eyebrow: { color: '#6b7280', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' },
  title: { margin: '6px 0 0', fontSize: 34 },
  status: { background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '9px 14px', fontWeight: 700, fontSize: 14 },
  dot: { marginRight: 5 },
  profileCard: { marginTop: 28, display: 'flex', alignItems: 'center', gap: 16, padding: 20, border: '1px solid #e5e7eb', borderRadius: 16 },
  avatar: { width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#1877f2', color: '#fff', fontSize: 22, fontWeight: 800 },
  name: { fontSize: 20, fontWeight: 700 },
  muted: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  accessCard: { marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, background: '#f0fdf4', color: '#166534' },
  check: { width: 28, height: 28, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 },
  tokenCard: { marginTop: 22, padding: 20, border: '1px solid #e5e7eb', borderRadius: 16, background: '#fafafa' },
  section: { marginTop: 30 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { margin: 0, fontSize: 22 },
  tokenValid: { background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 },
  tokenInvalid: { background: '#fee2e2', color: '#991b1b', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 },
  tokenGrid: { marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 },
  label: { color: '#6b7280', fontSize: 12, marginBottom: 5 },
  tokenNote: { marginTop: 18, color: '#6b7280', fontSize: 12 },
  count: { minWidth: 24, height: 24, borderRadius: 999, background: '#eef2ff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 },
  page: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: '1px solid #e5e7eb', borderRadius: 14 },
  pageIcon: { width: 42, height: 42, borderRadius: 10, background: '#eef2ff', display: 'grid', placeItems: 'center', fontWeight: 800 },
  empty: { marginTop: 12, padding: 18, borderRadius: 14, background: '#f9fafb', color: '#6b7280' },
  warning: { marginTop: 12, padding: 16, borderRadius: 14, background: '#fff7ed', color: '#9a3412' },
  footer: { marginTop: 32, paddingTop: 22, borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  disconnect: { border: 0, borderRadius: 10, padding: '11px 16px', background: '#111827', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  back: { color: '#1877f2', textDecoration: 'none', fontWeight: 600 }
};
