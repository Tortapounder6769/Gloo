'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ProjectUser } from '@/lib/projectUsers'

interface MentionMenuProps {
  query: string
  users: ProjectUser[]
  onSelect: (user: ProjectUser) => void
  onClose: () => void
}

const roleLabels: Record<string, string> = {
  superintendent: 'Super',
  project_manager: 'PM',
  foreman: 'Foreman',
  subcontractor: 'Sub',
  owner: 'Owner',
}

const roleColors: Record<string, string> = {
  superintendent: 'bg-orange-500/20 text-orange-400',
  project_manager: 'bg-purple-500/20 text-purple-400',
  foreman: 'bg-blue-500/20 text-blue-400',
  subcontractor: 'bg-slate-500/20 text-slate-400',
  owner: 'bg-green-500/20 text-green-400',
}

export default function MentionMenu({
  query,
  users,
  onSelect,
  onClose,
}: MentionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (roleLabels[u.role] || '').toLowerCase().includes(q)
    )
  }, [query, users])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length])

  const handleSelect = useCallback(
    (index: number) => {
      const user = filtered[index]
      if (user) onSelect(user)
    },
    [filtered, onSelect]
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (filtered.length === 0 && e.key !== 'Escape') return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev >= filtered.length - 1 ? 0 : prev + 1
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev <= 0 ? filtered.length - 1 : prev - 1
          )
          break
        case 'Tab':
          e.preventDefault()
          handleSelect(selectedIndex)
          break
        case 'Enter':
          e.preventDefault()
          handleSelect(selectedIndex)
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, handleSelect, onClose])

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-card shadow-lg animate-[slideUp_100ms_ease-out]">
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Mention someone
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-text-muted">
              No matching people
            </div>
          ) : (
            filtered.map((user, i) => (
              <div
                key={user.id}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  i === selectedIndex ? 'bg-[#2a2e36]' : 'hover:bg-[#2a2e36]'
                }`}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => handleSelect(i)}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    roleColors[user.role] || 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {user.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    roleColors[user.role] || 'bg-slate-500/15 text-slate-400'
                  }`}
                >
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
