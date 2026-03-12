import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { OverdueCountProvider } from "@/contexts/OverdueCountContext";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-tc",
});

export const metadata: Metadata = {
  title: "Casino 高爾夫球隊",
  description: "投注管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.variable} font-sans antialiased bg-[#f8f9fa]`}>
        <OverdueCountProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto pb-20 md:pb-0">
              {children}
            </main>
          </div>
          <MobileNav />
        </OverdueCountProvider>
      </body>
    </html>
  );
}
