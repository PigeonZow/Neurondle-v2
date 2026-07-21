import type { Metadata } from 'next'
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

// Three voices: Space Grotesk is the wordmark, Plex Mono carries every datum
// (indices, scores, coordinates), Plex Sans carries the rest.
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-wordmark',
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Neurondle',
  description: 'Guess where neurons are located based on what text activates them',
  keywords: ['AI', 'interpretability', 'neurons', 'game', 'UMAP', 'SAE'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`dark ${grotesk.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="font-sans bg-ink text-starlight antialiased">
        {children}
      </body>
    </html>
  )
}
