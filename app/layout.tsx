import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dungeon Master',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#111', color: '#eee' }}>
        {children}
      </body>
    </html>
  );
}
