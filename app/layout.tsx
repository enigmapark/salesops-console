import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";
import { Nav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lingo · Neuro SalesOps",
  description: "링고·뉴로 제품별 리드·계약·매출·채널 성과를 한곳에서 관리하는 세일즈 운영 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen">
        <AuthGate>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </AuthGate>
      </body>
    </html>
  );
}
