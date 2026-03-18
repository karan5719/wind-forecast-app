import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WindCast Monitor — UK Wind Generation Forecast',
  description: 'Monitor actual vs forecasted UK national wind power generation from Elexon BMRS data.',
  keywords: ['wind power', 'UK', 'forecast', 'generation', 'BMRS', 'Elexon'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-950 text-white antialiased font-sans">{children}</body>
    </html>
  )
}
