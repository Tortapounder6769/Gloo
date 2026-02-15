'use client'

interface PromptPillsProps {
  onInsert: (text: string) => void
}

const pills = [
  { label: 'Weather', snippet: 'Weather: ' },
  { label: 'Crew count', snippet: 'Crew on site: ' },
  { label: 'Deliveries', snippet: 'Deliveries: ' },
  { label: 'Issues', snippet: 'Issues/delays: ' },
] as const

export default function PromptPills({ onInsert }: PromptPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <button
          key={pill.label}
          type="button"
          onClick={() => onInsert(pill.snippet)}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors cursor-pointer"
        >
          {pill.label}
        </button>
      ))}
    </div>
  )
}
