import { Role } from '@/types/models'

export interface ProjectUser {
  id: string
  name: string
  role: Role
}

const ALL_USERS: ProjectUser[] = [
  { id: 'user_super', name: 'Mike Sullivan', role: 'superintendent' },
  { id: 'user_pm', name: 'Sarah Chen', role: 'project_manager' },
  { id: 'user_foreman', name: 'Carlos Martinez', role: 'foreman' },
  { id: 'user_sub', name: 'Alex Kim', role: 'subcontractor' },
  { id: 'user_owner', name: 'David Park', role: 'owner' },
]

const PROJECT_MEMBERS: Record<string, string[]> = {
  'project-1': ['user_super', 'user_pm', 'user_foreman', 'user_sub', 'user_owner'],
  'project-2': ['user_pm', 'user_sub', 'user_owner'],
}

export function getProjectUsers(projectId: string): ProjectUser[] {
  const memberIds = PROJECT_MEMBERS[projectId] || []
  return ALL_USERS.filter(u => memberIds.includes(u.id))
}

export function getUserById(userId: string): ProjectUser | undefined {
  return ALL_USERS.find(u => u.id === userId)
}
