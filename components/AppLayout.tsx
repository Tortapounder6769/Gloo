'use client'

import { Suspense, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import Sidebar from './Sidebar'
import { getChannelById } from '@/lib/channels'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  )
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Don't show sidebar on auth pages or when not authenticated
  const isAuthPage = pathname === '/' || pathname === '/signin'
  const showSidebar = status === 'authenticated' && !isAuthPage

  // Determine current channel for the top bar
  const isOnLogPage = pathname?.includes('/log') || false
  const channelParam = searchParams?.get('channel') || null

  let channelName = 'general'
  let channelDescription = 'Project-wide discussion'

  if (isOnLogPage) {
    channelName = 'daily-log'
    channelDescription = 'Daily job site logs'
  } else if (channelParam) {
    const channel = getChannelById(channelParam)
    if (channel) {
      channelName = channel.name
      channelDescription = channel.description
    }
  }

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark">
      <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden bg-main">
        {/* Top Bar */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-main px-6">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile hamburger */}
            <button
              className="mr-3 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="text-base font-bold text-text-primary"># {channelName}</span>
            <div className="mx-3 h-5 w-px bg-border" />
            <span className="text-sm text-text-muted hidden sm:inline">{channelDescription}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center">
            {/* Stacked avatars */}
            <div className="flex -space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-main bg-accent text-xs font-bold text-white">
                M
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-main bg-cg-blue text-xs font-bold text-white">
                S
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-main bg-cg-green text-xs font-bold text-white">
                A
              </div>
            </div>
            <button className="ml-3 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-card">
              Details
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
