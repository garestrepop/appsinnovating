import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asistente de Requerimientos",
  description:
    "Asistente para entrevistas de levantamiento de requerimientos de software",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border bg-surface/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-purple to-accent-blue text-sm font-bold text-white shadow-[0_0_14px_rgba(168,85,247,0.55)]">
                AR
              </span>
              <span>Asistente de Requerimientos</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
