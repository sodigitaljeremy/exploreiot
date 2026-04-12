import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ExploreIOT Dashboard — Supervision IoT LoRaWAN",
  description: "Dashboard de supervision IoT LoRaWAN — démonstration du pipeline complet d'encodage et décodage de trames capteurs.",
  openGraph: {
    title: "ExploreIOT Dashboard — Supervision IoT LoRaWAN",
    description: "Dashboard temps réel de supervision de capteurs IoT LoRaWAN avec pipeline complet d'encodage/décodage.",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExploreIOT Dashboard",
    description: "Supervision IoT LoRaWAN temps réel — du capteur physique à l'interface web.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
