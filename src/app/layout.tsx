import type { ReactNode } from 'react';

export const metadata = {
  title: "Valex API · Creaciones Valery's",
  description: 'API REST de la tienda de amigurumis.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem', lineHeight: 1.5 }}>{children}</body>
    </html>
  );
}
