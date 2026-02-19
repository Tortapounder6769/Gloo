'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SlashCommand, SLASH_COMMANDS } from '@/lib/slashCommands'

interface SlashCommandMenuProps {
  query: string
  onSelect: (cmd: SlashCommand) => void
  onClose: () => void
  onPhoto: () => void
}

const PHOTO_COMMAND: SlashCommand = {
  command: '/photo',
  label: 'Photo',
  description: 'Attach a photo',
  tagIds: ['photo'],
  color: '',
  placeholder: '',
}

export default function SlashCommandMenu({
  query,
  onSelect,
  onClose,
  onPhoto,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const matching = SLASH_COMMANDS.filter((cmd) =>
      cmd.command.startsWith(q)
    )
    // Always append photo at the end
    if (PHOTO_COMMAND.command.startsWith(q)) {
      return [...matching, PHOTO_COMMAND]
    }
    return matching
  }, [query])

  // Reset selection when list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length])

  const handleSelect = useCallback(
    (index: number) => {
      const item = filtered[index]
      if (!item) return
      if (item.command === '/photo') {
        onPhoto()
      } else {
        onSelect(item)
      }
    },
    [filtered, onSelect, onPhoto]
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
        <div
          className="rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-[slideUp_100ms_ease-out]"
        >
        <div className="px-3 py-2">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Commands
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-sm text-text-muted">
            No matching commands
          </div>
        ) : (
          filtered.map((cmd, i) => (
            <div
              key={cmd.command}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                i === selectedIndex ? 'bg-[#2a2e36]' : 'hover:bg-[#2a2e36]'
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => handleSelect(i)}
            >
              {cmd.command === '/photo' ? (
                <svg
                  className="h-4 w-4 shrink-0 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
                  />
                </svg>
              ) : (
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${cmd.color.split(' ')[0] || ''}`}
                />
              )}
              <span className="font-mono text-sm text-text-primary">
                {cmd.command}
              </span>
              <span className="text-sm text-text-muted ml-auto">
                {cmd.description}
              </span>
            </div>
          ))
        )}
        </div>
      </div>
    </>
  )
}
