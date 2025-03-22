import type { Metadata } from 'next'
import './globals.css'
import { TournamentScheduler } from "./tournament-scheduler"

export const metadata: Metadata = {
  title: 'Titties App',
  description: 'Created for titties',
  generator: 'titties.fun',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <TournamentScheduler />
        {children}
      </body>
    </html>
  )
}
