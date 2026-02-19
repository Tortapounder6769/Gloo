'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Message } from '@/types/models'
import { ChannelConfig } from '@/lib/channels'
import { detectTags } from '@/lib/detectTags'
import { formatTimestamp } from '@/lib/formatTimestamp'
import { createMessage, markChannelAsRead } from '@/lib/store'
import { compressImage } from '@/lib/imageUtils'
import ImageLightbox from '@/components/ImageLightbox'
import { SlashCommand, SLASH_COMMANDS } from '@/lib/slashCommands'
import SlashCommandMenu from '@/components/SlashCommandMenu'
import MentionMenu from '@/components/MentionMenu'
import { getProjectUsers, ProjectUser } from '@/lib/projectUsers'

interface ChannelViewProps {
  projectId: string
  channelConfig: ChannelConfig
  allMessages: Message[]
  onDataChange?: () => void
}

const roleBadgeStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/15 text-orange-400',
  project_manager: 'bg-purple-500/15 text-purple-400',
  foreman: 'bg-blue-500/15 text-blue-400',
  subcontractor: 'bg-slate-500/15 text-slate-400',
  owner: 'bg-green-500/15 text-green-400',
}

const roleAvatarStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-purple-400',
  foreman: 'bg-blue-500/20 text-blue-400',
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

export default function ChannelView({ projectId, channelConfig, allMessages, onDataChange }: ChannelViewProps) {
  const { data: session } = useSession()
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeTag, setActiveTag] = useState<SlashCommand | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [stagedImage, setStagedImage] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mention state
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionedUsers, setMentionedUsers] = useState<ProjectUser[]>([])


  const projectUsers = useMemo(() => getProjectUsers(projectId), [projectId])

  const filteredMessages = useMemo(() => {
    return allMessages.filter(msg => {
      const tags = detectTags(msg.content)
      const hasAutoTag = tags.some(tag => channelConfig.tagIds.includes(tag.id))
      const hasExplicitTag = (msg.tags || []).some(id => channelConfig.tagIds.includes(id))
      return hasAutoTag || hasExplicitTag
    })
  }, [allMessages, channelConfig.tagIds])

  const composeTags = useMemo(() => detectTags(newMessage), [newMessage])

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

  const tagLabels = channelConfig.tagIds
    .map(id => {
      const tagMap: Record<string, string> = {
        concrete: 'concrete', electrical: 'electrical', framing: 'framing',
        plumbing: 'plumbing', hvac: 'HVAC', roofing: 'roofing', safety: 'safety',
        rfi: 'RFI', inspection: 'inspection', schedule: 'schedule',
        delay: 'delay', weather: 'weather',
      }
      return tagMap[id] || id
    })
    .join(', ')

  // Mark channel as read on mount
  useEffect(() => {
    if (session?.user?.id) {
      markChannelAsRead(session.user.id, projectId, channelConfig.id)
    }
  }, [session?.user?.id, projectId, channelConfig.id])

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    if (filteredMessages.length > 0) {
      setTimeout(() => scrollToBottom(true), 50)
    }
  }, [filteredMessages.length, scrollToBottom])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !stagedImage) || !session?.user || isSending) return

    setIsSending(true)

    // Post to general thread — the tag detection will make it show in this channel
    createMessage(
      projectId,
      null,
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
    markChannelAsRead(session.user.id, projectId, channelConfig.id)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setTimeout(() => {
      setIsSending(false)
      onDataChange?.()
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

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-6">
        {filteredMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-card">
              <svg className="h-6 w-6 sm:h-8 sm:w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary">No messages in #{channelConfig.name} yet</h3>
            <p className="mt-1 max-w-sm text-sm text-text-muted">
              Messages with {tagLabels}-related content will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMessages.map((msg, index) => {
              const prevMsg = index > 0 ? filteredMessages[index - 1] : null
              const isGrouped = prevMsg?.authorId === msg.authorId
              const msgTags = detectTags(msg.content)

              const threadLabel = msg.scheduleItemId ? 'Schedule Item' : 'General'

              if (isGrouped) {
                return (
                  <div key={msg.id} className="flex gap-3 pl-11">
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
                          <img src={msg.image} alt="Shared image" className="max-w-[200px] sm:max-w-[300px] rounded-lg border border-border hover:opacity-90 transition-opacity" />
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
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                        {threadLabel}
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
                        <img src={msg.image} alt="Shared image" className="max-w-[200px] sm:max-w-[300px] rounded-lg border border-border hover:opacity-90 transition-opacity" />
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

      {/* Compose box */}
      <div className="border-t border-border bg-main p-3 sm:p-4" onPaste={handlePaste}>
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
          {composeTags.length > 0 && (
            <div className="mb-2 text-xs text-slate-500">
              {composeTags.map(t => t.label).join(' \u00B7 ')}
            </div>
          )}
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
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-lg p-2 text-text-muted hover:text-text-secondary hover:bg-card transition-colors"
              title="Attach image"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>
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
              placeholder={activeTag ? activeTag.placeholder : (session?.user ? `Message #${channelConfig.name} as ${session.user.name}...` : 'Type a message...')}
              className="max-h-24 flex-1 resize-none overflow-y-auto rounded-lg border border-border bg-input px-3 sm:px-4 py-2 text-[16px] sm:text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={(!newMessage.trim() && !stagedImage) || isSending}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                (!newMessage.trim() && !stagedImage) || isSending
                  ? 'cursor-not-allowed bg-card text-text-muted'
                  : 'bg-accent text-dark hover:bg-amber-500'
              }`}
            >
              {isSending ? 'Sent' : 'Send'}
            </button>
          </form>
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          Messages post to #general and appear here when they match #{channelConfig.name} tags
        </p>
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
