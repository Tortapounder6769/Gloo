'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { ScheduleItem, Message, ScheduleItemStatus } from '@/types/models'
import {
  createMessage,
  markThreadAsRead,
  updateScheduleItemStatus,
  updateScheduleItem,
  deleteScheduleItem,
} from '@/lib/store'
import { detectTags } from '@/lib/detectTags'
import { formatTimestamp } from '@/lib/formatTimestamp'
import { compressImage } from '@/lib/imageUtils'
import ImageLightbox from '@/components/ImageLightbox'
import { SlashCommand, SLASH_COMMANDS } from '@/lib/slashCommands'
import SlashCommandMenu from '@/components/SlashCommandMenu'
import MentionMenu from '@/components/MentionMenu'
import { getProjectUsers, ProjectUser } from '@/lib/projectUsers'

interface ThreadViewProps {
  projectId: string
  scheduleItem: ScheduleItem
  messages: Message[]
  onBack: () => void
  onDataChange: () => void
  onDelete: () => void
}

const statusStyles: Record<string, string> = {
  not_started: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-cg-blue border-blue-500/30',
  completed: 'bg-green-500/20 text-cg-green border-green-500/30',
  at_risk: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  blocked: 'bg-red-500/20 text-cg-red border-red-500/30',
}

const statusButtonStyles: Record<string, { base: string; active: string }> = {
  not_started: { base: 'border-border text-text-muted hover:bg-card', active: 'border-slate-500/30 bg-slate-500/20 text-slate-400' },
  in_progress: { base: 'border-border text-text-muted hover:bg-card', active: 'border-blue-500/30 bg-blue-500/20 text-cg-blue' },
  completed: { base: 'border-border text-text-muted hover:bg-card', active: 'border-green-500/30 bg-green-500/20 text-cg-green' },
  at_risk: { base: 'border-border text-text-muted hover:bg-card', active: 'border-orange-500/30 bg-orange-500/20 text-orange-400' },
  blocked: { base: 'border-border text-text-muted hover:bg-card', active: 'border-red-500/30 bg-red-500/20 text-cg-red' },
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
  superintendent: 'bg-orange-500/15 text-orange-400',
  project_manager: 'bg-purple-500/15 text-cg-purple',
  foreman: 'bg-blue-500/15 text-cg-blue',
  subcontractor: 'bg-slate-500/15 text-slate-400',
  owner: 'bg-green-500/15 text-green-400',
}

const roleAvatarStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-cg-purple',
  foreman: 'bg-blue-500/20 text-cg-blue',
  subcontractor: 'bg-slate-500/20 text-slate-400',
  owner: 'bg-green-500/20 text-green-400',
}

const roleLabels: Record<string, string> = {
  superintendent: 'Super',
  project_manager: 'PM',
  foreman: 'Foreman',
  subcontractor: 'Sub',
  owner: 'Owner',
}

const userNames: Record<string, string> = {
  'user_super': 'Mike Sullivan',
  'user_pm': 'Sarah Chen',
  'user_foreman': 'Carlos Martinez',
  'user_sub': 'Alex Kim',
  'user_owner': 'David Park',
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
  const [editAssignedTo, setEditAssignedTo] = useState<string[]>(item.assignedTo || [])

  const [activeTag, setActiveTag] = useState<SlashCommand | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [stagedImage, setStagedImage] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mention state
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionedUsers, setMentionedUsers] = useState<ProjectUser[]>([])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const today = new Date().toISOString().split('T')[0]
  const isPastDue = item.status !== 'completed' && item.dueDate < today

  // Smart compose tag detection
  const composeTags = useMemo(() => detectTags(newMessage), [newMessage])
  const projectUsers = useMemo(() => getProjectUsers(projectId), [projectId])

  const handleSlashSelect = (cmd: SlashCommand) => {
    setActiveTag(cmd)
    setNewMessage('')
    setShowSlashMenu(false)
    textareaRef.current?.focus()
  }

  const handleSlashClose = () => {
    setShowSlashMenu(false)
  }

  const handleMentionSelect = (user: ProjectUser) => {
    const beforeAt = newMessage.lastIndexOf('@')
    const before = newMessage.slice(0, beforeAt)
    const after = newMessage.slice(beforeAt + 1 + mentionQuery.length)
    setNewMessage(before + '@' + user.name + ' ' + after)
    setMentionedUsers(prev => prev.some(u => u.id === user.id) ? prev : [...prev, user])
    setShowMentionMenu(false)
    setMentionQuery('')
    textareaRef.current?.focus()
  }

  const handleMentionClose = () => {
    setShowMentionMenu(false)
    setMentionQuery('')
  }

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
    if ((!newMessage.trim() && !stagedImage) || !session?.user || isSending) return

    setIsSending(true)
    shouldAutoScrollRef.current = true

    createMessage(
      projectId,
      item.id,
      session.user.id,
      session.user.name,
      session.user.role,
      newMessage.trim(),
      stagedImage || undefined,
      activeTag ? activeTag.tagIds : undefined,
      mentionedUsers.length > 0 ? mentionedUsers.map(u => u.id) : undefined
    )

    setNewMessage('')
    setStagedImage(null)
    setActiveTag(null)
    setShowSlashMenu(false)
    setMentionedUsers([])
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
    if (showMentionMenu && ['Enter', 'Tab', 'ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
      return // let MentionMenu handle it
    }
    if (showSlashMenu && ['Enter', 'Tab', 'ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
      return // let SlashCommandMenu's document listener handle it
    }
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    try {
      const compressed = await compressImage(file)
      setStagedImage(compressed)
    } catch { /* ignore */ }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          try {
            const compressed = await compressImage(file)
            setStagedImage(compressed)
          } catch { /* ignore */ }
        }
        return
      }
    }
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
    setEditAssignedTo(item.assignedTo || [])
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editDueDate) return
    const updated = updateScheduleItem(item.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      dueDate: editDueDate,
      assignedTo: editAssignedTo,
    })
    if (updated) setItem(updated)
    setIsEditing(false)
    onDataChange()
  }

  const handleDelete = () => {
    deleteScheduleItem(item.id)
    onDelete()
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
      <div className="border-b border-border bg-main px-6 py-4">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-sm text-cg-blue hover:text-blue-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Schedule
        </button>

        {!isEditing ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-text-primary">{item.title}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                {statusLabels[item.status]}
              </span>
              {isPastDue && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-cg-red">
                  Past Due
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              <span>Due: {formatDate(item.dueDate)}</span>
              {item.assignedTo.length > 0 && (
                <>
                  <span>{'\u00B7'}</span>
                  <span>{item.assignedTo.map(id => userNames[id] || id).join(', ')}</span>
                </>
              )}
            </div>

            {item.description && (
              <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="font-medium text-cg-red">Delete this item?</span>
                  <button
                    onClick={handleDelete}
                    className="rounded-md bg-cg-red px-3 py-1.5 text-xs font-medium text-white hover:bg-red-400"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card"
                  >
                    No
                  </button>
                </span>
              )}
            </div>

            {/* Status Toggle */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase text-text-muted">Update Status</p>
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
                <p className="mt-2 text-xs font-medium text-cg-green">{statusToast}</p>
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
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="text"
              placeholder="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="space-y-1">
                <label className="block text-xs text-text-muted">Assigned To</label>
                <div className="space-y-1">
                  {[
                    { id: 'user_super', name: 'Mike Sullivan' },
                    { id: 'user_pm', name: 'Sarah Chen' },
                    { id: 'user_foreman', name: 'Carlos Martinez' },
                    { id: 'user_sub', name: 'Alex Kim' },
                    { id: 'user_owner', name: 'David Park' },
                  ].map(user => (
                    <label key={user.id} className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={editAssignedTo.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditAssignedTo([...editAssignedTo, user.id])
                          } else {
                            setEditAssignedTo(editAssignedTo.filter(id => id !== user.id))
                          }
                        }}
                        className="rounded border-border bg-input text-accent focus:ring-accent"
                      />
                      {user.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-card"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-dark hover:bg-amber-500"
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
        className="flex-1 overflow-y-auto bg-main p-6"
        onScroll={() => { shouldAutoScrollRef.current = isNearBottom() }}
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No comments yet. Add the first comment!</p>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null
              const isGrouped = prevMsg?.authorId === msg.authorId
              const msgTags = detectTags(msg.content)

              if (isGrouped) {
                return (
                  <div key={msg.id} className="animate-fadeIn flex gap-3 pl-11">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-text-secondary">
                          {msg.content.split(/(@\w[\w\s]*?\w(?=\s|$)|@\w+)/g).map((part, i) =>
                            part.startsWith('@') ? (
                              <span key={i} className="font-medium text-accent">{part}</span>
                            ) : part
                          )}
                        </p>
                        <span className="shrink-0 text-xs text-text-muted">{formatTimestamp(msg.createdAt)}</span>
                      </div>
                      {msg.image && (
                        <button type="button" onClick={() => setLightboxSrc(msg.image!)} className="mt-2 block">
                          <img src={msg.image} alt="Shared image" className="max-w-[300px] rounded-lg border border-border hover:opacity-90 transition-opacity" />
                        </button>
                      )}
                      {(() => {
                        const allTags = [
                          ...msgTags.map(t => ({ id: t.id, label: t.label, color: t.color, bgColor: t.bgColor })),
                          ...(msg.tags || []).filter(id => !msgTags.some(t => t.id === id)).map(id => {
                            const cmd = SLASH_COMMANDS.find(c => c.tagIds.includes(id))
                            return cmd ? { id, label: cmd.label, color: cmd.color.split(' ')[1], bgColor: cmd.color.split(' ')[0] } : null
                          }).filter(Boolean) as { id: string; label: string; color: string; bgColor: string }[]
                        ]
                        return allTags.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {allTags.map(tag => (
                              <span key={tag.id} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tag.bgColor} ${tag.color}`}>{tag.label}</span>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className={`animate-fadeIn flex gap-3 ${index > 0 ? 'mt-4' : ''}`}>
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
                    <p className="mt-1 text-sm text-text-secondary">
                      {msg.content.split(/(@\w[\w\s]*?\w(?=\s|$)|@\w+)/g).map((part, i) =>
                        part.startsWith('@') ? (
                          <span key={i} className="font-medium text-accent">{part}</span>
                        ) : part
                      )}
                    </p>
                    {msg.image && (
                      <button type="button" onClick={() => setLightboxSrc(msg.image!)} className="mt-2 block">
                        <img src={msg.image} alt="Shared image" className="max-w-[300px] rounded-lg border border-border hover:opacity-90 transition-opacity" />
                      </button>
                    )}
                    {(() => {
                      const allTags = [
                        ...msgTags.map(t => ({ id: t.id, label: t.label, color: t.color, bgColor: t.bgColor })),
                        ...(msg.tags || []).filter(id => !msgTags.some(t => t.id === id)).map(id => {
                          const cmd = SLASH_COMMANDS.find(c => c.tagIds.includes(id))
                          return cmd ? { id, label: cmd.label, color: cmd.color.split(' ')[1], bgColor: cmd.color.split(' ')[0] } : null
                        }).filter(Boolean) as { id: string; label: string; color: string; bgColor: string }[]
                      ]
                      return allTags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {allTags.map(tag => (
                            <span key={tag.id} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tag.bgColor} ${tag.color}`}>{tag.label}</span>
                          ))}
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Smart Compose Box */}
      <div className="border-t border-border bg-main p-4" onPaste={handlePaste}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="relative">
          {showSlashMenu && (
            <SlashCommandMenu
              query={newMessage}
              onSelect={handleSlashSelect}
              onClose={handleSlashClose}
              onPhoto={() => fileInputRef.current?.click()}
            />
          )}
          {showMentionMenu && !showSlashMenu && (
            <MentionMenu
              query={mentionQuery}
              users={projectUsers}
              onSelect={handleMentionSelect}
              onClose={handleMentionClose}
            />
          )}
          {mentionedUsers.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {mentionedUsers.map(u => (
                <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent animate-[scaleIn_150ms_ease-out]">
                  @{u.name}
                  <button type="button" onClick={() => setMentionedUsers(prev => prev.filter(p => p.id !== u.id))} className="ml-0.5 hover:opacity-70">×</button>
                </span>
              ))}
            </div>
          )}
          {activeTag && (
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium animate-[scaleIn_150ms_ease-out] ${activeTag.color}`}>
                {activeTag.label}
                <button type="button" onClick={() => setActiveTag(null)} className="ml-0.5 hover:opacity-70">×</button>
              </span>
            </div>
          )}
          {/* Smart tags bar */}
          {newMessage.trim() === '' ? (
            <p className="mb-2 text-xs text-text-muted">Smart tags will appear as you type...</p>
          ) : composeTags.length > 0 ? (
            <div className="mb-2 text-xs text-slate-500">
              {composeTags.map(t => t.label).join(' \u00B7 ')}
            </div>
          ) : null}

          {stagedImage && (
            <div className="mb-2 flex items-start gap-2">
              <div className="relative">
                <img src={stagedImage} alt="Staged" className="h-20 w-20 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setStagedImage(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-text-muted hover:text-text-primary text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={newMessage}
              onChange={(e) => {
                const val = e.target.value
                setNewMessage(val)
                if (val.startsWith('/')) {
                  setShowSlashMenu(true)
                } else if (!val.startsWith('/')) {
                  setShowSlashMenu(false)
                }
                // Detect @mention
                const atIndex = val.lastIndexOf('@')
                if (atIndex >= 0 && !val.startsWith('/')) {
                  const afterAt = val.slice(atIndex + 1)
                  const charBefore = atIndex > 0 ? val[atIndex - 1] : ' '
                  if (charBefore === ' ' || atIndex === 0) {
                    if (!afterAt.includes(' ')) {
                      setMentionQuery(afterAt)
                      setShowMentionMenu(true)
                    } else {
                      setShowMentionMenu(false)
                    }
                  }
                } else if (atIndex < 0) {
                  setShowMentionMenu(false)
                }
              }}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={activeTag ? activeTag.placeholder : (session?.user ? `Comment as ${session.user.name}...` : 'Add a comment...')}
              className="max-h-24 w-full resize-none overflow-y-auto rounded-lg border border-border bg-input px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />

            {/* Toolbar row */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1.5 text-text-muted transition-colors hover:text-text-secondary">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded p-1.5 text-text-muted transition-colors hover:text-text-secondary">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button type="button" className="rounded p-1.5 text-text-muted transition-colors hover:text-text-secondary">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button type="button" className="rounded p-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-secondary">
                  @
                </button>
              </div>
              <button
                type="submit"
                disabled={(!newMessage.trim() && !stagedImage) || isSending}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  (newMessage.trim() || stagedImage) && !isSending
                    ? 'bg-accent text-dark hover:bg-amber-500'
                    : 'cursor-not-allowed bg-card text-text-muted'
                }`}
              >
                {isSending ? 'Sent' : newMessage.trim() ? 'Send \u2191' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Hint text */}
        <p className="mt-2 text-xs text-text-muted">Glue auto-detects trades, delays, inspections, and work items from your message</p>
      </div>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          isOpen={!!lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  )
}
