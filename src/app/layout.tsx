import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Site Generator - Creatine Funnel Builder',
  description: 'Generate marketing funnel sites with AI-powered content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

