'use client'

import { useState } from 'react'

interface RequestChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (note: string) => void
  submitterName: string
}

export default function RequestChangesModal({ isOpen, onClose, onSubmit, submitterName }: RequestChangesModalProps) {
  const [note, setNote] = useState('')

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = () => {
    if (!note.trim()) return
    onSubmit(note.trim())
    setNote('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-md mx-4 rounded-lg border border-border bg-card p-6">
        {/* Title */}
        <h2 className="text-lg font-semibold text-text-primary">Request Changes</h2>
        <p className="mt-1 text-sm text-text-muted">
          Send a note to {submitterName} about what needs to be updated.
        </p>

        {/* Textarea */}
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the changes needed..."
          className="mt-4 w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus
        />

        {/* Buttons */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!note.trim()}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              note.trim()
                ? 'bg-accent text-dark hover:bg-amber-500'
                : 'cursor-not-allowed bg-card text-text-muted border border-border'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
