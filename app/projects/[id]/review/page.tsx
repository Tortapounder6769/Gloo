'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Project, SubLog } from '@/types/models'
import { getProjectById, getSubLogsForProject, updateSubLogStatus, initializeStore } from '@/lib/store'
import SubLogCard from '@/components/SubLogCard'
import RequestChangesModal from '@/components/RequestChangesModal'

type TabFilter = 'pending' | 'all'

export default function ReviewPage() {
  const { data: session } = useSession()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [subLogs, setSubLogs] = useState<SubLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabFilter>('pending')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  const loadData = useCallback(() => {
    if (!session?.user) return
    initializeStore()
    const proj = getProjectById(projectId)
    setProject(proj || null)
    const logs = getSubLogsForProject(projectId)
    setSubLogs(logs)
    setIsLoading(false)
  }, [session, projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAccept = (id: string) => {
    if (!session?.user) return
    updateSubLogStatus(id, 'accepted', session.user.id)
    setSubLogs(getSubLogsForProject(projectId))
  }

  const handleRequestChanges = (id: string) => {
    setSelectedLogId(id)
    setModalOpen(true)
  }

  const handleSubmitChanges = (note: string) => {
    if (!session?.user || !selectedLogId) return
    updateSubLogStatus(selectedLogId, 'changes_requested', session.user.id, note)
    setSubLogs(getSubLogsForProject(projectId))
    setModalOpen(false)
    setSelectedLogId(null)
  }

  const filteredLogs = activeTab === 'pending'
    ? subLogs.filter(log => log.status === 'pending')
    : subLogs

  const pendingCount = subLogs.filter(log => log.status === 'pending').length
  const selectedLog = selectedLogId ? subLogs.find(l => l.id === selectedLogId) : null

  if (isLoading) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex h-64 items-center justify-center text-text-muted">Loading...</div>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/projects" className="mb-4 inline-block text-text-muted hover:text-accent">
            &larr; Back to Projects
          </Link>
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <h3 className="text-lg font-medium text-text-primary">Project not found</h3>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-5">
          <Link
            href={`/projects/${projectId}?channel=general`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          <p className="text-sm text-text-muted">Review Sub Logs</p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex items-center gap-1 rounded-lg bg-card p-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-accent-soft text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-dark">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-accent-soft text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
        </div>

        {/* Log list */}
        {filteredLogs.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-3 flex justify-center">
              <svg className="h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">
              {activeTab === 'pending' ? 'No pending logs to review' : 'No sub logs submitted yet'}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {activeTab === 'pending' ? 'All sub-contractor logs have been reviewed.' : 'Sub-contractor logs will appear here once submitted.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map(log => (
              <SubLogCard
                key={log.id}
                subLog={log}
                onAccept={handleAccept}
                onRequestChanges={handleRequestChanges}
              />
            ))}
          </div>
        )}
      </div>

      {/* Request Changes Modal */}
      <RequestChangesModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedLogId(null)
        }}
        onSubmit={handleSubmitChanges}
        submitterName={selectedLog?.submitterName || ''}
      />
    </main>
  )
}
