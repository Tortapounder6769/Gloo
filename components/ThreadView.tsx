'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ScheduleItem, Message, ScheduleItemStatus } from '@/types/models'
import {
  createMessage,
  markThreadAsRead,
  updateScheduleItemStatus,
  updateScheduleItem,
  deleteScheduleItem,
} from '@/lib/store'

interface ThreadViewProps {
  projectId: string
  scheduleItem: ScheduleItem
  messages: Message[]
  onBack: () => void
  onDataChange: () => void
  onDelete: () => void
}

const statusStyles: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-700 border-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  at_risk: 'bg-orange-100 text-orange-700 border-orange-300',
  blocked: 'bg-red-100 text-red-700 border-red-300',
}

const statusButtonStyles: Record<string, { base: string; active: string }> = {
  not_started: { base: 'border-slate-300 text-slate-600 hover:bg-slate-50', active: 'border-slate-500 bg-slate-100 text-slate-800' },
  in_progress: { base: 'border-blue-300 text-blue-600 hover:bg-blue-50', active: 'border-blue-500 bg-blue-100 text-blue-800' },
  completed: { base: 'border-green-300 text-green-600 hover:bg-green-50', active: 'border-green-500 bg-green-100 text-green-800' },
  at_risk: { base: 'border-orange-300 text-orange-600 hover:bg-orange-50', active: 'border-orange-500 bg-orange-100 text-orange-800' },
  blocked: { base: 'border-red-300 text-red-600 hover:bg-red-50', active: 'border-red-500 bg-red-100 text-red-800' },
}

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  at_risk: 'At Risk',
  blocked: 'Blocked',
}

const statusIcons: Record<string, string> = {
  not_started: '\u25CB',
  in_progress: '\u25D4',
  completed: '\u2713',
  at_risk: '\u26A0',
  blocked: '\u2715',
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

const allStatuses: ScheduleItemStatus[] = ['not_started', 'in_progress', 'completed', 'at_risk', 'blocked']

export default function ThreadView({
  projectId,
  scheduleItem,
  messages,
  onBack,
  onDataChange,
  onDelete,
}: ThreadViewProps) {
  const { data: session } = useSession()
  const [item, setItem] = useState(scheduleItem)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [statusToast, setStatusToast] = useState<string | null>(null)

  // Edit form state
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description || '')
  const [editDueDate, setEditDueDate] = useState(item.dueDate)
  const [editAssignedTo, setEditAssignedTo] = useState(item.assignedTo || '')

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const today = new Date().toISOString().split('T')[0]
  const isPastDue = item.status !== 'completed' && item.dueDate < today

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

  // Mark as read on mount
  useEffect(() => {
    if (session?.user) {
      markThreadAsRead(session.user.id, projectId, item.id)
    }
  }, [session, projectId, item.id])

  // Scroll to bottom on mount
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(true), 50)
    }
  }, [messages.length, scrollToBottom])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user || isSending) return

    setIsSending(true)
    shouldAutoScrollRef.current = true

    createMessage(
      projectId,
      item.id,
      session.user.id,
      session.user.name,
      session.user.role,
      newMessage.trim()
    )

    setNewMessage('')
    markThreadAsRead(session.user.id, projectId, item.id)

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

  const handleStatusChange = (newStatus: ScheduleItemStatus) => {
    if (item.status === newStatus) return
    setItem(prev => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }))
    updateScheduleItemStatus(item.id, newStatus)
    setStatusToast(`Status updated to ${statusLabels[newStatus]}`)
    setTimeout(() => setStatusToast(null), 2000)
    onDataChange()
  }

  const handleStartEdit = () => {
    setEditTitle(item.title)
    setEditDescription(item.description || '')
    setEditDueDate(item.dueDate)
    setEditAssignedTo(item.assignedTo || '')
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editDueDate) return
    const updated = updateScheduleItem(item.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      dueDate: editDueDate,
      assignedTo: editAssignedTo || undefined,
    })
    if (updated) setItem(updated)
    setIsEditing(false)
    onDataChange()
  }

  const handleDelete = () => {
    deleteScheduleItem(item.id)
    onDelete()
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Schedule
        </button>

        {!isEditing ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{item.title}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                {statusLabels[item.status]}
              </span>
              {isPastDue && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Past Due
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>Due: {formatDate(item.dueDate)}</span>
              {item.assignedTo && (
                <>
                  <span>•</span>
                  <span>{userNames[item.assignedTo] || 'Unknown'}</span>
                </>
              )}
            </div>

            {item.description && (
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="font-medium text-red-600">Delete this item?</span>
                  <button
                    onClick={handleDelete}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    No
                  </button>
                </span>
              )}
            </div>

            {/* Status Toggle */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                      item.status === status
                        ? statusButtonStyles[status].active
                        : statusButtonStyles[status].base
                    }`}
                  >
                    <span className="mr-1">{statusIcons[status]}</span>
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
              {statusToast && (
                <p className="mt-2 text-xs font-medium text-green-600">{statusToast}</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title *"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                <option value="user_super">Mike Sullivan</option>
                <option value="user_pm">Sarah Chen</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6"
        onScroll={() => { shouldAutoScrollRef.current = isNearBottom() }}
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No comments yet. Add the first comment!</p>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null
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
            placeholder={session?.user ? `Comment as ${session.user.name}...` : 'Add a comment...'}
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
  )
}
