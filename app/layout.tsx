import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.apttennis.com.br"),
  applicationName: "APT Tennis Club",
  title: "APT Tennis Club | Beyond the Court",
  description:
    "Clube de tênis em Brasília com entrada por indicação e análise. Ranking masculino, quatro divisões e rodadas quinzenais.",
  openGraph: {
    title: "APT Tennis Club",
    description: "Clube de tênis em Brasília com entrada por indicação e análise. Ranking masculino e rodadas quinzenais.",
    url: "/",
    siteName: "APT Tennis Club",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-apt-social.png", width: 1200, height: 630, alt: "APT Tennis Club — O jogo começa na quadra." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "APT Tennis Club",
    description: "Clube de tênis em Brasília com entrada por indicação e análise. Ranking masculino e rodadas quinzenais.",
    images: ["/og-apt-social.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/logo-apt3-navy.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/pwa/icon-192.png",
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "APT Tennis",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f4f6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head><link rel="preload" href="/fonts/outfit-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head>
      <body>{children}</body>
    </html>
  );
}
