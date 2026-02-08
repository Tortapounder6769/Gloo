import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import AppLayout from '@/components/AppLayout'
import './globals.css'

export const metadata: Metadata = {
  title: 'ConstructionGlue',
  description: 'Internal construction coordination tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-dark text-text-primary antialiased">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  )
}
