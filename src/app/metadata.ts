import type { Metadata, Viewport } from "next";
import { VERSION } from '@/lib/version';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: "SiLynkr - Modern AI Chat Interface by Si4k",
  description: "A powerful chat interface for AI models with conversation management, sharing, and advanced controls. Developed by Si4k.",
  keywords: "SiLynkr, Si4k, AI chat, chat interface, si4k.me",
  authors: [{ name: "Si4k", url: "https://si4k.me" }],
  generator: `SiLynkr ${VERSION.version}`,
  openGraph: {
    title: "SiLynkr - Modern AI Chat Interface by Si4k",
    description: "Chat with AI models using SiLynkr, a feature-rich web UI with conversation management and advanced controls.",
    type: "website",
    siteName: "SiLynkr by Si4k"
  },
  twitter: {
    card: "summary_large_image",
    title: "SiLynkr by Si4k",
    description: "A modern web interface for AI models",
    site: "@si4k"
  }
}; 