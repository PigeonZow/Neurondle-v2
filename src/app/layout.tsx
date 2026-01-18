import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-game-bg text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
