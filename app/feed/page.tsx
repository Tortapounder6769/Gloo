'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { initializeStore, getThreadsForUser, markThreadAsRead } from '@/lib/store'
import { formatTimestamp } from '@/lib/formatTimestamp'
import type { ThreadInfo } from '@/lib/store'

const ROLE_COLORS: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-purple-400',
  foreman: 'bg-blue-500/20 text-blue-400',
  subcontractor: 'bg-slate-500/20 text-slate-400',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function FeedPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [threads, setThreads] = useState<ThreadInfo[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const loadThreads = useCallback(() => {
    if (!session?.user) return
    initializeStore()
    const data = getThreadsForUser(
      session.user.id,
      session.user.role,
      session.user.projectIds || []
    )
    setThreads(data)
  }, [session?.user])

  // Load threads on mount and when refreshKey changes
  useEffect(() => {
    loadThreads()
  }, [loadThreads, refreshKey])

  // Reload when the page regains focus (e.g. user returns via back button)
  useEffect(() => {
    const handleFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleThreadClick = (thread: ThreadInfo) => {
    if (session?.user) {
      markThreadAsRead(session.user.id, thread.projectId, thread.scheduleItemId)
    }
    if (thread.scheduleItemId) {
      router.push(`/projects/${thread.projectId}?channel=schedule&item=${thread.scheduleItemId}`)
    } else {
      router.push(`/projects/${thread.projectId}?channel=general`)
    }
  }

  return (
    <div className="flex h-full flex-col bg-main">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-text-primary">Your Feed</h1>
        <p className="mt-1 text-sm text-text-muted">
          Threads you&apos;re involved in, sorted by recent activity
        </p>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg
              className="mb-4 h-12 w-12 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium text-text-secondary">
              You&apos;re all caught up
            </p>
            <p className="mt-1 text-sm text-text-muted">
              No active threads to show right now.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map((thread) => {
              const lastMsg =
                thread.messages.length > 0
                  ? thread.messages[thread.messages.length - 1]
                  : null
              const preview = lastMsg
                ? lastMsg.content.length > 100
                  ? lastMsg.content.slice(0, 100) + '...'
                  : lastMsg.content
                : ''

              const displayParticipants = thread.participants.slice(0, 4)

              return (
                <button
                  key={`${thread.projectId}-${thread.scheduleItemId ?? 'general'}`}
                  onClick={() => handleThreadClick(thread)}
                  className="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-[#2a2e36]"
                >
                  {/* Unread indicator dot */}
                  <div className="mt-2 flex shrink-0 items-center">
                    {thread.unreadCount > 0 ? (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Top row: title + project badge + unread count */}
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-text-primary">
                        {thread.title}
                      </span>
                      <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-xs text-text-muted">
                        {thread.projectName}
                      </span>
                      {thread.unreadCount > 0 && (
                        <span className="ml-auto shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-dark">
                          {thread.unreadCount} new
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <p className="mt-1 truncate text-sm text-text-muted">
                        <span className="font-medium text-text-secondary">
                          {lastMsg.authorName}:
                        </span>{' '}
                        {preview}
                      </p>
                    )}

                    {/* Bottom row: participants + timestamp */}
                    <div className="mt-2 flex items-center gap-3">
                      {/* Participant avatars */}
                      <div className="flex -space-x-1.5">
                        {displayParticipants.map((p) => (
                          <div
                            key={p.id}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-main ${
                              ROLE_COLORS[p.role] || 'bg-slate-500/20 text-slate-400'
                            }`}
                            title={p.name}
                          >
                            {getInitials(p.name)}
                          </div>
                        ))}
                        {thread.participants.length > 4 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-[10px] font-bold text-text-muted ring-2 ring-main">
                            +{thread.participants.length - 4}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="ml-auto text-xs text-text-muted">
                        {formatTimestamp(thread.lastActivity)}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
