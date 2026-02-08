'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Project } from '@/types/models'
import {
  getProjects,
  getScheduleItemsForProject,
  getUnreadCountForThread,
  initializeStore,
} from '@/lib/store'

const statusStyles: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400',
  on_hold: 'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-slate-500/15 text-slate-400',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [projectUnreadCounts, setProjectUnreadCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  const loadProjectList = useCallback(() => {
    if (!session?.user) return

    initializeStore()

    const allProjects = getProjects()
    const userProjects = allProjects.filter(p =>
      session.user.projectIds?.includes(p.id)
    )
    setProjects(userProjects)

    // Calculate unread counts per project
    const counts: Record<string, number> = {}
    userProjects.forEach(project => {
      let total = getUnreadCountForThread(session.user.id, project.id, null)
      const items = getScheduleItemsForProject(project.id)
      items.forEach(item => {
        total += getUnreadCountForThread(session.user.id, project.id, item.id)
      })
      counts[project.id] = total
    })
    setProjectUnreadCounts(counts)
    setIsLoading(false)
  }, [session])

  useEffect(() => {
    if (session?.user) {
      loadProjectList()
    }
  }, [session, loadProjectList])

  const handleSelectProject = (projectId: string) => {
    router.push(`/projects/${projectId}?channel=general`)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-main px-6 py-4">
        <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
        <p className="mt-1 text-sm text-text-muted">Select a project to view channels and messages</p>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-card">
              <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-text-primary">No projects found</h2>
            <p className="mt-1 text-sm text-text-muted">You are not assigned to any projects yet.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {projects.map((project) => {
              const unreadCount = projectUnreadCounts[project.id] || 0

              return (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-medium text-text-primary">
                          {project.name}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{project.address}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        Contract: {project.contractNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-accent px-2 text-xs font-bold text-dark">
                          {unreadCount}
                        </span>
                      )}
                      <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
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
