export const metadata = {
  title: 'Facebook Auth Test',
  description: 'Minimal Facebook OAuth test on Vercel'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f7fb', color: '#111827' }}>
        {children}
      </body>
    </html>
  );
}
