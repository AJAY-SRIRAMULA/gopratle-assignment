import './globals.css';

export const metadata = {
  title: 'GoPratle Requirements — share your event requirements',
  description: 'A four-step flow for posting event planner, performer and crew requirements.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
