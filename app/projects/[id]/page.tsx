'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Project, ScheduleItem, Message, ScheduleItemStatus } from '@/types/models'
import {
  getProjectById,
  getScheduleItemsForProject,
  getAllMessagesForProject,
  getMessagesForThread,
  createMessage,
  markChannelAsRead,
  markThreadAsRead,
  getUnreadCountForThread,
  updateScheduleItemStatus,
  createScheduleItem,
  initializeStore,
} from '@/lib/store'
import { getChannelById, ChannelConfig } from '@/lib/channels'
import { detectTags } from '@/lib/detectTags'
import { formatTimestamp, pluralize } from '@/lib/formatTimestamp'
import ChannelView from '@/components/ChannelView'
import ThreadView from '@/components/ThreadView'

// Style maps
const projectStatusStyles: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400',
  on_hold: 'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-slate-500/15 text-slate-400',
}

const projectStatusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

const roleBadgeStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/15 text-orange-400',
  project_manager: 'bg-purple-500/15 text-purple-400',
  foreman: 'bg-blue-500/15 text-blue-400',
  subcontractor: 'bg-slate-500/15 text-slate-400',
}

const roleAvatarStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-purple-400',
  foreman: 'bg-blue-500/20 text-blue-400',
  subcontractor: 'bg-slate-500/20 text-slate-400',
}

const roleLabels: Record<string, string> = {
  superintendent: 'Super',
  project_manager: 'PM',
  foreman: 'Foreman',
  subcontractor: 'Sub',
}

const statusStyles: Record<string, string> = {
  not_started: 'bg-slate-500/20 text-slate-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  at_risk: 'bg-orange-500/20 text-orange-400',
  blocked: 'bg-red-500/20 text-red-400',
}

const statusBarColors: Record<string, string> = {
  not_started: 'bg-slate-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  at_risk: 'bg-orange-400',
  blocked: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  at_risk: 'At Risk',
  blocked: 'Blocked',
}

const userNames: Record<string, string> = {
  'user_super': 'Mike Sullivan',
  'user_pm': 'Sarah Chen',
  'user_foreman': 'Carlos Martinez',
  'user_sub': 'Alex Kim',
}

type ViewMode = 'channel' | 'thread'

export default function ProjectChannelPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  const projectId = params.id as string
  const channelId = searchParams.get('channel') || 'general'
  const itemId = searchParams.get('item') || null

  // Data state
  const [project, setProject] = useState<Project | null>(null)
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [generalMessages, setGeneralMessages] = useState<Message[]>([])
  const [itemMessages, setItemMessages] = useState<Record<string, Message[]>>({})
  const [itemUnreads, setItemUnreads] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>(itemId ? 'thread' : 'channel')

  // General chat state
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Schedule add-item state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [filterStatus, setFilterStatus] = useState<ScheduleItemStatus | 'all'>('all')

  const today = new Date().toISOString().split('T')[0]

  const channelConfig = useMemo(() => getChannelById(channelId), [channelId])
  const composeTags = detectTags(newMessage)

  // Load project data
  const loadData = useCallback(() => {
    if (!session?.user || !projectId) return

    initializeStore()
    const proj = getProjectById(projectId)
    if (!proj) return

    setProject(proj)
    const items = getScheduleItemsForProject(projectId)
    setScheduleItems(items)

    const all = getAllMessagesForProject(projectId)
    setAllMessages(all)

    const gen = getMessagesForThread(projectId, null)
    setGeneralMessages(gen)

    const msgMap: Record<string, Message[]> = {}
    const unreadMap: Record<string, number> = {}
    items.forEach(item => {
      msgMap[item.id] = getMessagesForThread(projectId, item.id)
      unreadMap[item.id] = getUnreadCountForThread(session.user.id, projectId, item.id)
    })
    setItemMessages(msgMap)
    setItemUnreads(unreadMap)

    setIsLoading(false)
  }, [session, projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Set view mode from URL params
  useEffect(() => {
    if (itemId && channelId === 'schedule') {
      setViewMode('thread')
    } else {
      setViewMode('channel')
    }
  }, [itemId, channelId])

  // Mark channel as read on mount
  useEffect(() => {
    if (session?.user && projectId && channelConfig && viewMode === 'channel') {
      markChannelAsRead(session.user.id, projectId, channelId)
      // Also mark general thread read for general channel
      if (channelConfig.type === 'general') {
        markThreadAsRead(session.user.id, projectId, null)
      }
    }
  }, [session, projectId, channelId, channelConfig, viewMode])

  // Scroll helpers
  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' })
  }, [])

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }, [])

  // Scroll to bottom when general messages load
  useEffect(() => {
    if (channelConfig?.type === 'general' && generalMessages.length > 0 && viewMode === 'channel') {
      setTimeout(() => scrollToBottom(true), 50)
    }
  }, [channelConfig, generalMessages.length, scrollToBottom, viewMode])

  // Send message in general channel
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user || isSending) return

    setIsSending(true)
    shouldAutoScrollRef.current = true

    createMessage(
      projectId,
      null,
      session.user.id,
      session.user.name,
      session.user.role,
      newMessage.trim()
    )

    setNewMessage('')
    markThreadAsRead(session.user.id, projectId, null)
    markChannelAsRead(session.user.id, projectId, 'general')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setTimeout(() => {
      setIsSending(false)
      loadData()
      scrollToBottom()
    }, 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as unknown as React.FormEvent)
    }
  }

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // Schedule item handlers
  const handleSelectItem = (selectedItemId: string) => {
    router.push(`/projects/${projectId}?channel=schedule&item=${selectedItemId}`)
  }

  const handleBackFromThread = () => {
    router.push(`/projects/${projectId}?channel=schedule`)
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newDueDate) return

    createScheduleItem(
      projectId,
      newTitle.trim(),
      newDueDate,
      newDescription.trim() || undefined
    )

    setNewTitle('')
    setNewDueDate('')
    setNewDescription('')
    setShowAddForm(false)
    loadData()
  }

  const handleMarkComplete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    updateScheduleItemStatus(id, 'completed')
    loadData()
  }

  const handleDataChange = () => {
    loadData()
  }

  const handleItemDelete = () => {
    router.push(`/projects/${projectId}?channel=schedule`)
    loadData()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncateMessage = (content: string, maxLen = 60) => {
    if (content.length <= maxLen) return content
    return content.substring(0, maxLen).trim() + '...'
  }

  // Filtered schedule items
  const filteredItems = filterStatus === 'all'
    ? scheduleItems
    : scheduleItems.filter(i => i.status === filterStatus)

  // Thread view item
  const selectedItem = itemId ? scheduleItems.find(i => i.id === itemId) : null
  const selectedItemMessages = itemId ? (itemMessages[itemId] || []) : []

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-muted">Project not found</p>
      </div>
    )
  }

  // Thread view for schedule items
  if (viewMode === 'thread' && selectedItem) {
    return (
      <ThreadView
        projectId={projectId}
        scheduleItem={selectedItem}
        messages={selectedItemMessages}
        onBack={handleBackFromThread}
        onDataChange={handleDataChange}
        onDelete={handleItemDelete}
      />
    )
  }

  // Channel content rendering
  const renderChannelContent = () => {
    if (!channelConfig) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-text-muted">Channel not found</p>
        </div>
      )
    }

    // General channel: full chat with compose
    if (channelConfig.type === 'general') {
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6"
            onScroll={() => { shouldAutoScrollRef.current = isNearBottom() }}
          >
            {generalMessages.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">No messages yet. Start the conversation!</p>
            ) : (
              <div className="space-y-1">
                {generalMessages.map((msg, index) => {
                  const prevMsg = index > 0 ? generalMessages[index - 1] : null
                  const isGrouped = prevMsg?.authorId === msg.authorId
                  const msgTags = detectTags(msg.content)

                  if (isGrouped) {
                    return (
                      <div key={msg.id} className="flex gap-3 pl-11">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-text-secondary">{msg.content}</p>
                            <span className="shrink-0 text-xs text-text-muted">{formatTimestamp(msg.createdAt)}</span>
                          </div>
                          {msgTags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {msgTags.map(tag => (
                                <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tag.bgColor} ${tag.color}`}>
                                  <span>{tag.icon}</span>
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className={`flex gap-3 ${index > 0 ? 'mt-4' : ''}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${roleAvatarStyles[msg.authorRole] || 'bg-slate-500/20 text-slate-400'}`}>
                        {msg.authorName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-text-primary">{msg.authorName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeStyles[msg.authorRole] || 'bg-slate-500/15 text-slate-400'}`}>
                            {roleLabels[msg.authorRole] || msg.authorRole}
                          </span>
                          <span className="text-xs text-text-muted">{formatTimestamp(msg.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{msg.content}</p>
                        {msgTags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {msgTags.map(tag => (
                              <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tag.bgColor} ${tag.color}`}>
                                <span>{tag.icon}</span>
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Compose box */}
          <div className="border-t border-border bg-main p-4">
            {composeTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {composeTags.map(tag => (
                  <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tag.bgColor} ${tag.color}`}>
                    <span>{tag.icon}</span>
                    {tag.label}
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={session?.user ? `Message as ${session.user.name}...` : 'Type a message...'}
                className="max-h-24 flex-1 resize-none overflow-y-auto rounded-lg border border-border bg-input px-4 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                  !newMessage.trim() || isSending
                    ? 'cursor-not-allowed bg-card text-text-muted'
                    : 'bg-accent text-dark hover:bg-amber-500'
                }`}
              >
                {isSending ? 'Sent' : 'Send'}
              </button>
            </form>
            {newMessage.trim() && (
              <p className="mt-1.5 text-xs text-text-muted">Press Enter to send, Shift+Enter for new line</p>
            )}
          </div>
        </div>
      )
    }

    // Tag-filter channels: read-only filtered view
    if (channelConfig.type === 'tag-filter') {
      return (
        <ChannelView
          projectId={projectId}
          channelConfig={channelConfig}
          allMessages={allMessages}
        />
      )
    }

    // Schedule view channel
    if (channelConfig.type === 'schedule-view') {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Item Button & Filter */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ScheduleItemStatus | 'all')}
                className="rounded-md border border-border bg-input px-2 py-1 text-sm text-text-secondary"
              >
                <option value="all">All</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="at_risk">At Risk</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-dark hover:bg-amber-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleAddItem} className="mb-4 rounded-lg border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Title *"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-3 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-dark"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          {/* Schedule Items */}
          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">No items found</p>
            ) : (
              filteredItems.map((item) => {
                const msgs = itemMessages[item.id] || []
                const lastMsg = msgs[msgs.length - 1]
                const unread = itemUnreads[item.id] || 0
                const isPastDue = item.status !== 'completed' && item.dueDate < today

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className="w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-accent/30"
                  >
                    <div className={`h-1 ${statusBarColors[item.status]}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-text-primary">{item.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                              {statusLabels[item.status]}
                            </span>
                            {isPastDue && (
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                                Past Due
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                            <span>Due {formatDate(item.dueDate)}</span>
                            {item.assignedTo && <span>{userNames[item.assignedTo]}</span>}
                            <span>{pluralize(msgs.length, 'comment')}</span>
                          </div>
                          {lastMsg && (
                            <p className="mt-2 text-sm text-text-secondary">
                              <span className="font-medium text-text-primary">{lastMsg.authorName}:</span>{' '}
                              {truncateMessage(lastMsg.content)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {item.status !== 'completed' ? (
                            <button
                              onClick={(e) => handleMarkComplete(e, item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:border-green-500 hover:text-green-400"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {unread > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-dark">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )
    }

    // Navigation channels redirect (daily-log)
    if (channelConfig.type === 'navigation') {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-text-muted">Redirecting...</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <div className="border-b border-border bg-main px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/projects')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-card hover:text-text-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-text-primary">{project.name}</h1>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusStyles[project.status]}`}>
                {projectStatusLabels[project.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {renderChannelContent()}
      </div>
    </div>
  )
}
