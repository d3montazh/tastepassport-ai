import './globals.css';
import './enhancements.css';
import './animations.css';
import './cursor-blob.css';
import './taste-map.css';
import './mobile-polish.css';
import './language.css';
import ScrollEffects from './scroll-effects';
import ResultsActions from './results-actions';

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
        <ResultsActions />
      </body>
    </html>
  );
}
