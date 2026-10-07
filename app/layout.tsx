import './globals.css';
import './enhancements.css';

export const metadata = {
  title: 'TastePassport AI',
  description: 'Qloo-powered cultural taste recommendations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
