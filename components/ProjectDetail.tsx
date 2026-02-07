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
  not_started: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  at_risk: 'bg-orange-100 text-orange-700',
  blocked: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  at_risk: 'At Risk',
  blocked: 'Blocked',
}

const projectStatusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-slate-100 text-slate-600',
}

const projectStatusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

const roleBadgeStyles: Record<string, string> = {
  superintendent: 'bg-orange-100 text-orange-800',
  project_manager: 'bg-purple-100 text-purple-800',
  foreman: 'bg-blue-100 text-blue-800',
  subcontractor: 'bg-slate-100 text-slate-800',
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusStyles[project.status]}`}>
                {projectStatusLabels[project.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{project.address}</p>
            <p className="text-xs text-slate-400">{formatDateRange(project.startDate, project.endDate)}</p>
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
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
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
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
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
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleAddItem} className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Title *"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          {/* Schedule Items */}
          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No items found</p>
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
                    className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{item.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                            {statusLabels[item.status]}
                          </span>
                          {isPastDue && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Past Due
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>Due {formatDate(item.dueDate)}</span>
                          {item.assignedTo && <span>{userNames[item.assignedTo]}</span>}
                          <span>{msgs.length} comments</span>
                        </div>
                        {lastMsg && (
                          <p className="mt-2 text-sm text-slate-600">
                            <span className="font-medium">{lastMsg.authorName}:</span>{' '}
                            {truncateMessage(lastMsg.content, 60)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.status !== 'completed' ? (
                          <button
                            onClick={(e) => handleMarkComplete(e, item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-400 hover:border-green-500 hover:bg-green-50 hover:text-green-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {unread > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                            {unread}
                          </span>
                        )}
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
            <p className="py-8 text-center text-sm text-slate-500">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {msg.authorName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{msg.authorName}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {msg.threadName}
                        </span>
                        <span className="text-xs text-slate-400">{formatTimestamp(msg.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
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
              <p className="py-8 text-center text-sm text-slate-500">No messages yet. Start the conversation!</p>
            ) : (
              <div className="space-y-1">
                {generalMessages.map((msg, index) => {
                  const prevMsg = index > 0 ? generalMessages[index - 1] : null
                  const isGrouped = prevMsg?.authorId === msg.authorId

                  if (isGrouped) {
                    return (
                      <div key={msg.id} className="flex gap-3 pl-11">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-700">{msg.content}</p>
                            <span className="shrink-0 text-xs text-slate-400">{formatTimestamp(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className={`flex gap-3 ${index > 0 ? 'mt-4' : ''}`}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                        {msg.authorName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{msg.authorName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeStyles[msg.authorRole] || 'bg-slate-100 text-slate-800'}`}>
                            {roleLabels[msg.authorRole] || msg.authorRole}
                          </span>
                          <span className="text-xs text-slate-400">{formatTimestamp(msg.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{msg.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={session?.user ? `Message as ${session.user.name}...` : 'Type a message...'}
                className="max-h-24 flex-1 resize-none overflow-y-auto rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? 'Sent' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
