export interface ChannelConfig {
  id: string
  name: string
  description: string
  tagIds: string[]
  type: 'general' | 'tag-filter' | 'schedule-view' | 'navigation'
}

export const CHANNELS: ChannelConfig[] = [
  { id: 'general', name: 'general', description: 'Project-wide discussion', tagIds: [], type: 'general' },
  { id: 'concrete', name: 'concrete', description: 'Concrete, foundation & slab work', tagIds: ['concrete'], type: 'tag-filter' },
  { id: 'electrical', name: 'electrical', description: 'Electrical, panels & wiring', tagIds: ['electrical'], type: 'tag-filter' },
  { id: 'framing', name: 'framing', description: 'Framing, trusses & structural', tagIds: ['framing'], type: 'tag-filter' },
  { id: 'plumbing', name: 'plumbing', description: 'Plumbing, pipes & fixtures', tagIds: ['plumbing'], type: 'tag-filter' },
  { id: 'hvac', name: 'hvac', description: 'HVAC, ductwork & mechanical', tagIds: ['hvac'], type: 'tag-filter' },
  { id: 'roofing', name: 'roofing', description: 'Roofing & waterproofing', tagIds: ['roofing'], type: 'tag-filter' },
  { id: 'safety', name: 'safety', description: 'Safety, OSHA & fall protection', tagIds: ['safety'], type: 'tag-filter' },
  { id: 'rfis-submittals', name: 'rfis-submittals', description: 'RFIs, submittals & inspections', tagIds: ['rfi', 'inspection'], type: 'tag-filter' },
  { id: 'schedule', name: 'schedule', description: 'Schedule, timeline & milestones', tagIds: ['schedule'], type: 'schedule-view' },
  { id: 'daily-log', name: 'daily-log', description: 'Daily job site logs', tagIds: [], type: 'navigation' },
]

export function getChannelById(id: string): ChannelConfig | undefined {
  return CHANNELS.find(ch => ch.id === id)
}
