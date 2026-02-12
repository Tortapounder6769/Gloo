'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Project, ScheduleItem, Message, ScheduleItemStatus, DailyLog } from '@/types/models'
import {
  createMessage,
  markThreadAsRead,
  updateScheduleItemStatus,
  createScheduleItem,
} from '@/lib/store'
import { detectTags } from '@/lib/detectTags'
import { formatTimestamp, pluralize } from '@/lib/formatTimestamp'

interface ProjectDetailProps {
  project: Project
  scheduleItems: ScheduleItem[]
  generalMessages: Message[]
  itemMessages: Record<string, Message[]>
  itemUnreads: Record<string, number>
  dailyLogs: DailyLog[]
  activeTab: 'schedule' | 'activity' | 'general'
  onTabChange: (tab: 'schedule' | 'activity' | 'general') => void
  onSelectItem: (itemId: string) => void
  onDataChange: () => void
}

const statusStyles: Record<string, string> = {
  not_started: 'bg-slate-500/20 text-slate-400',
  in_progress: 'bg-blue-500/20 text-cg-blue',
  completed: 'bg-green-500/20 text-cg-green',
  at_risk: 'bg-orange-500/20 text-orange-400',
  blocked: 'bg-red-500/20 text-cg-red',
}

const statusBarColors: Record<string, string> = {
  not_started: 'bg-slate-500',
  in_progress: 'bg-cg-blue',
  completed: 'bg-cg-green',
  at_risk: 'bg-orange-400',
  blocked: 'bg-cg-red',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  at_risk: 'At Risk',
  blocked: 'Blocked',
}

const projectStatusStyles: Record<string, string> = {
  active: 'bg-green-500/15 text-cg-green',
  on_hold: 'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-slate-500/15 text-slate-400',
}

const projectStatusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

const roleBadgeStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-cg-purple',
  foreman: 'bg-blue-500/20 text-cg-blue',
  subcontractor: 'bg-slate-500/20 text-slate-400',
}

const roleAvatarColors: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-cg-purple',
  foreman: 'bg-blue-500/20 text-cg-blue',
  subcontractor: 'bg-slate-500/20 text-slate-400',
}

const roleLabels: Record<string, string> = {
  superintendent: 'Super',
  project_manager: 'PM',
  foreman: 'Foreman',
  subcontractor: 'Sub',
}

const userNames: Record<string, string> = {
  'user_super': 'Mike Sullivan',
  'user_pm': 'Sarah Chen',
  'user_foreman': 'Carlos Martinez',
  'user_sub': 'Alex Kim',
}

export default function ProjectDetail({
  project,
  scheduleItems,
  generalMessages,
  itemMessages,
  itemUnreads,
  dailyLogs,
  activeTab,
  onTabChange,
  onSelectItem,
  onDataChange,
}: ProjectDetailProps) {
  const { data: session } = useSession()
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<ScheduleItemStatus | 'all'>('all')

  // Form state for adding items
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const today = new Date().toISOString().split('T')[0]
  const hasTodayLog = dailyLogs.some(log => log.date === today)

  const composeTags = detectTags(newMessage)

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

  // Mark general thread as read when viewing it
  useEffect(() => {
    if (activeTab === 'general' && session?.user) {
      markThreadAsRead(session.user.id, project.id, null)
    }
  }, [activeTab, session, project.id])

  // Scroll to bottom when switching to general tab
  useEffect(() => {
    if (activeTab === 'general' && generalMessages.length > 0) {
      setTimeout(() => scrollToBottom(true), 50)
    }
  }, [activeTab, generalMessages.length, scrollToBottom])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user || isSending) return

    setIsSending(true)
    shouldAutoScrollRef.current = true

    createMessage(
      project.id,
      null,
      session.user.id,
      session.user.name,
      session.user.role,
      newMessage.trim()
    )

    setNewMessage('')
    markThreadAsRead(session.user.id, project.id, null)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setTimeout(() => {
      setIsSending(false)
      onDataChange()
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newDueDate) return

    createScheduleItem(
      project.id,
      newTitle.trim(),
      newDueDate,
      newDescription.trim() || undefined
    )

    setNewTitle('')
    setNewDueDate('')
    setNewDescription('')
    setShowAddForm(false)
    onDataChange()
  }

  const handleMarkComplete = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    updateScheduleItemStatus(itemId, 'completed')
    onDataChange()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const endDate = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startDate} - ${endDate}`
  }

  const filteredItems = filterStatus === 'all'
    ? scheduleItems
    : scheduleItems.filter(i => i.status === filterStatus)

  // Build activity feed
  const activityFeed = (() => {
    const allMessages: Array<Message & { threadName: string }> = []

    generalMessages.forEach(msg => {
      allMessages.push({ ...msg, threadName: 'General' })
    })

    Object.entries(itemMessages).forEach(([itemId, msgs]) => {
      const item = scheduleItems.find(i => i.id === itemId)
      msgs.forEach(msg => {
        allMessages.push({ ...msg, threadName: item?.title || 'Unknown' })
      })
    })

    return allMessages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })()

  const truncateMessage = (content: string, maxLen = 80) => {
    if (content.length <= maxLen) return content
    return content.substring(0, maxLen).trim() + '...'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-main px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary">{project.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusStyles[project.status]}`}>
                {projectStatusLabels[project.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{project.address}</p>
            <p className="text-xs text-text-muted">{formatDateRange(project.startDate, project.endDate)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1">
          {(['schedule', 'activity', 'general'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-accent text-dark'
                  : 'text-text-secondary hover:bg-card hover:text-text-primary'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' && (
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
                    onClick={() => onSelectItem(item.id)}
                    className="w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-accent/30"
                  >
                    {/* Status color bar */}
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
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-cg-red">
                                Past Due
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                            <span>Due {formatDate(item.dueDate)}</span>
                            {item.assignedTo.length > 0 && <span>{item.assignedTo.map(id => userNames[id] || id).join(', ')}</span>}
                            <span>{pluralize(msgs.length, 'comment')}</span>
                          </div>
                          {lastMsg && (
                            <p className="mt-2 text-sm text-text-secondary">
                              <span className="font-medium text-text-primary">{lastMsg.authorName}:</span>{' '}
                              {truncateMessage(lastMsg.content, 60)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {item.status !== 'completed' ? (
                            <button
                              onClick={(e) => handleMarkComplete(e, item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:border-cg-green hover:text-cg-green"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20 text-cg-green">
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
      )}

      {activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-6">
          {activityFeed.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((msg) => {
                const msgTags = detectTags(msg.content)
                return (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${roleAvatarColors[msg.authorRole] || 'bg-slate-500/20 text-slate-400'}`}>
                        {msg.authorName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-text-primary">{msg.authorName}</span>
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                            {msg.threadName}
                          </span>
                          <span className="text-xs text-text-muted">{formatTimestamp(msg.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{msg.content}</p>
                        {msgTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
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
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'general' && (
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
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${roleAvatarColors[msg.authorRole] || 'bg-slate-500/20 text-slate-400'}`}>
                        {msg.authorName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-text-primary">{msg.authorName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeStyles[msg.authorRole] || 'bg-slate-500/20 text-slate-400'}`}>
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

          {/* Input */}
          <div className="border-t border-border bg-main p-4">
            {/* Tag detection pills */}
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
      )}
    </div>
  )
}
