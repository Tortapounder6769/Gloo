export interface SlashCommand {
  command: string
  label: string
  description: string
  tagIds: string[]
  color: string
  placeholder: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/rfi', label: 'RFI', description: 'Request for information', tagIds: ['rfi'], color: 'bg-yellow-500/15 text-yellow-400', placeholder: 'RFI to: ' },
  { command: '/safety', label: 'Safety', description: 'Report a safety issue', tagIds: ['safety'], color: 'bg-red-500/15 text-red-400', placeholder: 'Safety issue: ' },
  { command: '/delay', label: 'Delay', description: 'Report a schedule delay', tagIds: ['delay', 'schedule'], color: 'bg-orange-500/15 text-orange-400', placeholder: 'Delay reason: ' },
  { command: '/change', label: 'Change Order', description: 'Document a change', tagIds: ['change'], color: 'bg-purple-500/15 text-purple-400', placeholder: 'Change description: ' },
  { command: '/punch', label: 'Punch List', description: 'Add punch list item', tagIds: ['punch'], color: 'bg-blue-500/15 text-blue-400', placeholder: 'Punch item: ' },
]
