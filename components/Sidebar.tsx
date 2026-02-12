'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useParams, useSearchParams, usePathname } from 'next/navigation'
import { CHANNELS } from '@/lib/channels'
import { getProjects, getUnreadCountsByChannel, getTotalUnreadForUser, initializeStore } from '@/lib/store'
import { Project } from '@/types/models'

interface SidebarProps {
  sidebarOpen?: boolean
  onClose?: () => void
}

const COLLAPSED_KEY = 'constructionglue-sidebar-collapsed'

const directMessages = [
  { name: 'Sarah Chen', initials: 'SC', color: 'bg-cg-purple', online: true },
  { name: 'Mike Rodriguez', initials: 'MR', color: 'bg-cg-blue', online: true },
  { name: 'Alex Kim', initials: 'AK', color: 'bg-cg-green', online: false },
]

export default function Sidebar({ sidebarOpen = false, onClose }: SidebarProps) {
  const { data: session } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({})
  const [feedUnread, setFeedUnread] = useState(0)

  const currentProjectId = params?.id as string | undefined
  const currentChannel = searchParams?.get('channel') || undefined
  const isOnLogPage = pathname?.includes('/log')

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLLAPSED_KEY)
      if (stored === 'true') {
        setIsCollapsed(true)
      }
    }
  }, [])

  // Load projects from store on mount
  useEffect(() => {
    initializeStore()
    const allProjects = getProjects()
    if (session?.user?.projectIds) {
      const filtered = allProjects.filter((p) =>
        session.user.projectIds.includes(p.id)
      )
      setProjects(filtered)
    }
    if (session?.user) {
      const total = getTotalUnreadForUser(session.user.id, session.user.role, session.user.projectIds || [])
      setFeedUnread(total)
    }
  }, [session?.user?.projectIds, session?.user])

  // Load unread counts for current project
  useEffect(() => {
    if (session?.user?.id && currentProjectId) {
      const counts = getUnreadCountsByChannel(session.user.id, currentProjectId)
      setChannelUnreads(counts)
    }
  }, [session?.user?.id, currentProjectId, currentChannel])

  const toggleCollapsed = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLLAPSED_KEY, String(next))
    }
  }

  const userInitials = session?.user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?'

  const statusDotColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-cg-green'
      case 'on_hold':
        return 'bg-yellow-400'
      case 'completed':
        return 'bg-text-muted'
      default:
        return 'bg-text-muted'
    }
  }

  const sidebarWidth = isCollapsed ? 'w-[60px]' : 'w-[260px]'

  const sidebarContent = (
    <div className={`flex h-full ${sidebarWidth} flex-col bg-sidebar transition-all duration-200`}>
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            G
          </div>
          {!isCollapsed && (
            <div className="text-lg font-bold whitespace-nowrap">
              <span className="text-text-primary">Construction</span>
              <span className="text-accent">Glue</span>
            </div>
          )}
        </div>
        {/* Collapse toggle - hidden on mobile */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-[#2a2e36] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto">
        {/* Feed link */}
        <div className="px-2 mb-2">
          <Link
            href="/feed"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              pathname === '/feed'
                ? 'bg-accent-soft text-accent'
                : 'text-text-secondary hover:bg-[#2a2e36] hover:text-text-primary'
            }`}
            title={isCollapsed ? 'Feed' : undefined}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            {!isCollapsed && (
              <>
                <span className="flex-1">Feed</span>
                {feedUnread > 0 && (
                  <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-bold text-dark">
                    {feedUnread}
                  </span>
                )}
              </>
            )}
          </Link>
        </div>

        {/* Active Projects */}
        <div className="mt-2 px-4 mb-2">
          {!isCollapsed && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Active Projects
            </h3>
          )}
        </div>
        <div>
          {projects.map((project) => {
            const isActive = currentProjectId === project.id
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}?channel=general`}
                onClick={onClose}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-[#2a2e36] hover:text-text-primary'
                }`}
                title={isCollapsed ? project.name : undefined}
              >
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotColor(project.status)}`}
                />
                {!isCollapsed && (
                  <span className="truncate">{project.name}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Channels - only show when a project is selected */}
        {currentProjectId && (
          <>
            <div className="mt-6 px-4 mb-2">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Channels
                </h3>
              )}
            </div>
            <div>
              {CHANNELS.map((channel) => {
                const isDailyLog = channel.id === 'daily-log'
                const href = isDailyLog
                  ? `/projects/${currentProjectId}/log`
                  : `/projects/${currentProjectId}?channel=${channel.id}`

                const isActiveChannel = isDailyLog
                  ? isOnLogPage
                  : currentChannel === channel.id

                return (
                  <Link
                    key={channel.id}
                    href={href}
                    onClick={onClose}
                    className={`mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      isActiveChannel
                        ? 'bg-accent-soft text-accent'
                        : 'text-text-secondary hover:bg-[#2a2e36]'
                    }`}
                    title={isCollapsed ? channel.name : undefined}
                  >
                    <span className="shrink-0 text-text-muted">#</span>
                    {!isCollapsed && (
                      <>
                        <span>{channel.name}</span>
                        {(channelUnreads[channel.id] || 0) > 0 && (
                          <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-bold text-dark">
                            {channelUnreads[channel.id]}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Direct Messages */}
        <div className="mt-6 px-4 mb-2">
          {!isCollapsed && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Direct Messages
            </h3>
          )}
        </div>
        <div>
          {directMessages.map((dm) => (
            <button
              key={dm.name}
              className="flex w-full items-center gap-2 px-4 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary hover:bg-[#2a2e36]"
              title={isCollapsed ? dm.name : 'Direct messages coming soon'}
              onClick={() => {}}
            >
              <div className="relative shrink-0">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${dm.color} text-[10px] font-bold text-white`}
                >
                  {dm.initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar ${
                    dm.online ? 'bg-cg-green' : 'bg-text-muted'
                  }`}
                />
              </div>
              {!isCollapsed && <span className="truncate">{dm.name}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom User Section - pinned to bottom */}
      <div className="mt-auto border-t border-border px-4 py-4">
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-dark transition-colors hover:opacity-90"
              title={session?.user?.name || 'User'}
            >
              {userInitials}
            </button>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-cg-green ring-2 ring-sidebar" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-text-primary">
                {session?.user?.name || 'User'}
              </div>
              <div className="text-xs text-text-muted">
                {session?.user?.role === 'superintendent' ? 'Superintendent' : 'Project Manager'}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute bottom-16 left-4 z-20 w-52 rounded-lg border border-border bg-card py-2 shadow-lg">
              <div className="px-4 py-2 text-sm">
                <div className="font-medium text-text-primary">{session?.user?.name}</div>
                <div className="text-xs text-text-muted">{session?.user?.email}</div>
              </div>
              <hr className="my-1 border-border" />
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-dark hover:text-text-primary"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop sidebar - always visible */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - slides in (always expanded on mobile) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Override collapsed state on mobile - always show expanded */}
        <div className="flex h-full w-[260px] flex-col bg-sidebar">
          {/* Re-render expanded sidebar for mobile */}
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
                G
              </div>
              <div className="text-lg font-bold whitespace-nowrap">
                <span className="text-text-primary">Construction</span>
                <span className="text-accent">Glue</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-[#2a2e36] transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable middle */}
          <div className="flex-1 overflow-y-auto">
            {/* Feed link */}
            <div className="px-2 mb-2">
              <Link
                href="/feed"
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                  pathname === '/feed'
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-[#2a2e36] hover:text-text-primary'
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
                <span className="flex-1">Feed</span>
                {feedUnread > 0 && (
                  <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-bold text-dark">
                    {feedUnread}
                  </span>
                )}
              </Link>
            </div>

            {/* Active Projects */}
            <div className="mt-2 px-4 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Active Projects
              </h3>
            </div>
            <div>
              {projects.map((project) => {
                const isActive = currentProjectId === project.id
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}?channel=general`}
                    onClick={onClose}
                    className={`flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-text-secondary hover:bg-[#2a2e36] hover:text-text-primary'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotColor(project.status)}`}
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Channels */}
            {currentProjectId && (
              <>
                <div className="mt-6 px-4 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Channels
                  </h3>
                </div>
                <div>
                  {CHANNELS.map((channel) => {
                    const isDailyLog = channel.id === 'daily-log'
                    const href = isDailyLog
                      ? `/projects/${currentProjectId}/log`
                      : `/projects/${currentProjectId}?channel=${channel.id}`

                    const isActiveChannel = isDailyLog
                      ? isOnLogPage
                      : currentChannel === channel.id

                    return (
                      <Link
                        key={channel.id}
                        href={href}
                        onClick={onClose}
                        className={`mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          isActiveChannel
                            ? 'bg-accent-soft text-accent'
                            : 'text-text-secondary hover:bg-[#2a2e36]'
                        }`}
                      >
                        <span className="shrink-0 text-text-muted">#</span>
                        <span>{channel.name}</span>
                        {(channelUnreads[channel.id] || 0) > 0 && (
                          <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-bold text-dark">
                            {channelUnreads[channel.id]}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

            {/* Direct Messages */}
            <div className="mt-6 px-4 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Direct Messages
              </h3>
            </div>
            <div>
              {directMessages.map((dm) => (
                <Link
                  key={dm.name}
                  href="/projects"
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary hover:bg-[#2a2e36]"
                >
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${dm.color} text-[10px] font-bold text-white`}
                    >
                      {dm.initials}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar ${
                        dm.online ? 'bg-cg-green' : 'bg-text-muted'
                      }`}
                    />
                  </div>
                  <span className="truncate">{dm.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom User Section */}
          <div className="mt-auto border-t border-border px-4 py-4">
            <div className="relative flex items-center gap-3">
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-dark transition-colors hover:opacity-90"
                  title={session?.user?.name || 'User'}
                >
                  {userInitials}
                </button>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-cg-green ring-2 ring-sidebar" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-text-primary">
                  {session?.user?.name || 'User'}
                </div>
                <div className="text-xs text-text-muted">
                  {session?.user?.role === 'superintendent' ? 'Superintendent' : 'Project Manager'}
                </div>
              </div>
            </div>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute bottom-16 left-4 z-20 w-52 rounded-lg border border-border bg-card py-2 shadow-lg">
                  <div className="px-4 py-2 text-sm">
                    <div className="font-medium text-text-primary">{session?.user?.name}</div>
                    <div className="text-xs text-text-muted">{session?.user?.email}</div>
                  </div>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-dark hover:text-text-primary"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
