// app/layout.tsx
import './globals.css';
import Header from './components/Header';

export const metadata = {
  title: 'AI学术社区',
  description: '开放、交流、学术',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#fafafa', color: '#333' }}>
        <Header />
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
