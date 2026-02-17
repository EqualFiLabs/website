import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EQUALFI | SOVEREIGN_INFRASTRUCTURE",
  description: "Oracle-Free DeFi. Zero-Rent Leverage. Sovereign Identity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jetbrainsMono.variable}`}>
      <body className="bg-black text-gray-100 antialiased selection:bg-white/20">
        {/* Layout wrapper removed - each page handles its own structure for maximum brutalism */}
        {children}
      </body>
    </html>
  );
}
