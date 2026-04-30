import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });
const outfit = Outfit({ 
  subsets: ["latin"],
  variable: '--font-outfit'
});

export const metadata: Metadata = {
  title: "Борщ Shop | Вкусная домашняя еда | Доставка на неделю",
  description: "Доставка премиальной домашней еды прямо к вашей двери. Свежий борщ, котлеты, и другое меню на каждый день.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} ${outfit.variable} antialiased bg-zinc-950 text-white`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
