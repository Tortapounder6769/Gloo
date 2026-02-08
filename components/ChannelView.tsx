'use client'

import { useMemo } from 'react'
import { Message } from '@/types/models'
import { ChannelConfig } from '@/lib/channels'
import { detectTags, DetectedTag } from '@/lib/detectTags'
import { formatTimestamp } from '@/lib/formatTimestamp'

interface ChannelViewProps {
  projectId: string
  channelConfig: ChannelConfig
  allMessages: Message[]
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

function TagPills({ tags }: { tags: DetectedTag[] }) {
  if (tags.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tag.bgColor} ${tag.color}`}
        >
          {tag.icon} {tag.label}
        </span>
      ))}
    </div>
  )
}

export default function ChannelView({ projectId, channelConfig, allMessages }: ChannelViewProps) {
  const filteredMessages = useMemo(() => {
    return allMessages.filter(msg => {
      const tags = detectTags(msg.content)
      return tags.some(tag => channelConfig.tagIds.includes(tag.id))
    })
  }, [allMessages, channelConfig.tagIds])

  const tagLabels = channelConfig.tagIds
    .map(id => {
      // Find tag label from a dummy detect
      const tagMap: Record<string, string> = {
        concrete: 'concrete',
        electrical: 'electrical',
        framing: 'framing',
        plumbing: 'plumbing',
        hvac: 'HVAC',
        roofing: 'roofing',
        safety: 'safety',
        rfi: 'RFI',
        inspection: 'inspection',
        schedule: 'schedule',
        delay: 'delay',
        weather: 'weather',
      }
      return tagMap[id] || id
    })
    .join(', ')

  return (
    <div className="flex h-full flex-col">
      {/* Filter banner */}
      <div className="border-b border-border bg-accent/5 px-6 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <p className="text-sm text-text-secondary">
            Messages are auto-filtered by trade tags. Post in <span className="font-medium text-accent">#general</span> to add messages.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-card">
              <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

              // Find what thread this message is from
              const threadLabel = msg.scheduleItemId ? 'Schedule Item' : 'General'

              if (isGrouped) {
                return (
                  <div key={msg.id} className="flex gap-3 pl-11">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-text-secondary">{msg.content}</p>
                        <span className="shrink-0 text-xs text-text-muted">{formatTimestamp(msg.createdAt)}</span>
                      </div>
                      <TagPills tags={msgTags} />
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
                    <p className="mt-1 text-sm text-text-secondary">{msg.content}</p>
                    <TagPills tags={msgTags} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
