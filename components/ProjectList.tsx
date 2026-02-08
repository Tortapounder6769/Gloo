'use client'

import { Project } from '@/types/models'

interface ProjectListProps {
  projects: Project[]
  selectedProjectId: string | null
  unreadCounts: Record<string, number>
  onSelectProject: (id: string) => void
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-500/15 text-cg-green',
  on_hold: 'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-slate-500/15 text-slate-400',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Done',
}

export default function ProjectList({
  projects,
  selectedProjectId,
  unreadCounts,
  onSelectProject,
}: ProjectListProps) {
  return (
    <div className="flex h-full flex-col bg-dark">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-text-primary">Projects</h2>
        <button className="rounded-md p-1.5 text-text-muted hover:bg-card hover:text-text-secondary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            No projects found
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => {
              const isSelected = project.id === selectedProjectId
              const unreadCount = unreadCounts[project.id] || 0

              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full rounded-xl p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-card border border-accent/30 ring-1 ring-accent/20'
                      : 'bg-card border border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-text-primary">
                          {project.name}
                        </span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusStyles[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {project.address}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-dark">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
