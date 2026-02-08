export interface DetectedTag {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
}

const TAG_DEFINITIONS: Array<{
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
  keywords: string[]
}> = [
  {
    id: 'concrete',
    label: 'Concrete',
    icon: '🧱',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/15',
    keywords: ['concrete', 'pour', 'foundation', 'slab', 'cure', 'forms', 'rebar'],
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: '⚡',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/15',
    keywords: ['electrical', 'panel', 'wire', 'conduit', 'circuit', 'breaker', 'rough-in'],
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    icon: '🔧',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/15',
    keywords: ['plumbing', 'pipe', 'drain', 'water', 'sewer', 'fixture'],
  },
  {
    id: 'framing',
    label: 'Framing',
    icon: '🪵',
    color: 'text-green-400',
    bgColor: 'bg-green-400/15',
    keywords: ['framing', 'stud', 'joist', 'header', 'truss', 'sheathing'],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    icon: '🏠',
    color: 'text-red-400',
    bgColor: 'bg-red-400/15',
    keywords: ['roof', 'roofing', 'shingle', 'membrane', 'flashing'],
  },
  {
    id: 'hvac',
    label: 'HVAC',
    icon: '❄️',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/15',
    keywords: ['hvac', 'duct', 'ductwork', 'mechanical', 'heating', 'cooling'],
  },
  {
    id: 'safety',
    label: 'Safety',
    icon: '🦺',
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/15',
    keywords: ['safety', 'guardrail', 'harness', 'osha', 'fall protection', 'hazard'],
  },
  {
    id: 'delay',
    label: 'Delay',
    icon: '⏱️',
    color: 'text-red-400',
    bgColor: 'bg-red-400/15',
    keywords: ['delay', 'delayed', 'pushed', 'backorder', 'hold', 'waiting'],
  },
  {
    id: 'rfi',
    label: 'RFI',
    icon: '📋',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/15',
    keywords: ['rfi', 'submittal', 'clarification', 'architect'],
  },
  {
    id: 'inspection',
    label: 'Inspection',
    icon: '🔍',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/15',
    keywords: ['inspection', 'inspector', 'passed', 'failed', 'code'],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: '📅',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/15',
    keywords: ['schedule', 'timeline', 'deadline', 'milestone'],
  },
  {
    id: 'weather',
    label: 'Weather',
    icon: '🌤️',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/15',
    keywords: ['weather', 'rain', 'wind', 'storm', 'temperature'],
  },
]

export function detectTags(text: string): DetectedTag[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const found: DetectedTag[] = []

  for (const def of TAG_DEFINITIONS) {
    const matched = def.keywords.some(kw => lower.includes(kw))
    if (matched) {
      found.push({
        id: def.id,
        label: def.label,
        icon: def.icon,
        color: def.color,
        bgColor: def.bgColor,
      })
    }
  }

  return found
}
