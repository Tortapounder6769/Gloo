'use client'

import { useState } from 'react'
import { SubLog } from '@/types/models'
import { formatTimestamp } from '@/lib/formatTimestamp'

interface SubLogCardProps {
  subLog: SubLog
  onAccept: (id: string) => void
  onRequestChanges: (id: string) => void
}

const roleBadgeStyles: Record<string, string> = {
  superintendent: 'bg-orange-500/15 text-orange-400',
  project_manager: 'bg-purple-500/15 text-cg-purple',
  foreman: 'bg-blue-500/15 text-cg-blue',
  subcontractor: 'bg-slate-500/15 text-slate-400',
  owner: 'bg-green-500/15 text-green-400',
}

const roleLabels: Record<string, string> = {
  superintendent: 'Super',
  project_manager: 'PM',
  foreman: 'Foreman',
  subcontractor: 'Sub',
  owner: 'Owner',
}

const statusBadgeStyles: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400',
  accepted: 'bg-green-500/15 text-cg-green',
  changes_requested: 'bg-red-500/15 text-cg-red',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  changes_requested: 'Changes Requested',
}

export default function SubLogCard({ subLog, onAccept, onRequestChanges }: SubLogCardProps) {
  const [showTranslation, setShowTranslation] = useState(false)

  const hasTranslation = subLog.language === 'es' && !!subLog.translatedTranscript
  const displayedText = hasTranslation && showTranslation
    ? subLog.translatedTranscript
    : subLog.rawTranscript

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-text-primary">{subLog.submitterName}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeStyles[subLog.submitterRole] || 'bg-slate-500/15 text-slate-400'}`}>
          {roleLabels[subLog.submitterRole] || subLog.submitterRole}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeStyles[subLog.status]}`}>
          {statusLabels[subLog.status]}
        </span>
      </div>

      {/* Date line */}
      <p className="mt-1 text-xs text-text-muted">
        {formatTimestamp(subLog.createdAt)}
      </p>

      {/* Transcript body */}
      <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
        {displayedText}
      </p>

      {/* Translation toggle */}
      {hasTranslation && (
        <button
          type="button"
          onClick={() => setShowTranslation(!showTranslation)}
          className="mt-2 text-xs text-cg-blue hover:text-blue-300 transition-colors"
        >
          {showTranslation ? 'Show Spanish' : 'Show English'}
        </button>
      )}

      {/* Status-specific sections */}
      {subLog.status === 'accepted' && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-cg-green">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Accepted</span>
        </div>
      )}

      {subLog.status === 'changes_requested' && subLog.reviewNote && (
        <div className="mt-3 rounded-md border border-border bg-input p-3">
          <p className="text-xs font-medium text-text-muted">Review Note</p>
          <p className="mt-1 text-sm text-text-secondary">{subLog.reviewNote}</p>
        </div>
      )}

      {subLog.status === 'pending' && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAccept(subLog.id)}
            className="rounded-md bg-green-500/20 px-4 py-1.5 text-sm font-medium text-cg-green hover:bg-green-500/30 transition-colors"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onRequestChanges(subLog.id)}
            className="rounded-md border border-border px-4 py-1.5 text-sm font-medium text-text-secondary hover:bg-card hover:border-accent hover:text-accent transition-colors"
          >
            Request Changes
          </button>
        </div>
      )}
    </div>
  )
}
