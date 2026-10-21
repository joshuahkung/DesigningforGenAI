import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Captions Admin",
  description: "Admin area for the Captions app",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
