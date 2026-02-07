'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Don't show sidebar on auth pages or when not authenticated
  const isAuthPage = pathname === '/' || pathname === '/signin'
  const showSidebar = status === 'authenticated' && !isAuthPage

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
