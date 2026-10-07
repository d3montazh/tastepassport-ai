import './globals.css';
import './enhancements.css';
import './animations.css';
import ScrollEffects from './scroll-effects';

export const metadata = {
  title: 'TastePassport AI',
  description: 'Translate your cultural taste into another city with a Qloo-powered AI agent.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ScrollEffects />
      </body>
    </html>
  );
}
