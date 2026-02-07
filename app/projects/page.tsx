'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Project, ScheduleItem, Message, DailyLog } from '@/types/models'
import {
  getProjects,
  getScheduleItemsForProject,
  getMessagesForThread,
  getUnreadCountForThread,
  getDailyLogsForProject,
  initializeStore,
} from '@/lib/store'
import ProjectList from '@/components/ProjectList'
import ProjectDetail from '@/components/ProjectDetail'
import ThreadView from '@/components/ThreadView'

type ViewMode = 'detail' | 'thread'
type ActiveTab = 'schedule' | 'activity' | 'general'

export default function ProjectsPage() {
  const { data: session } = useSession()

  // Project list state
  const [projects, setProjects] = useState<Project[]>([])
  const [projectUnreadCounts, setProjectUnreadCounts] = useState<Record<string, number>>({})

  // Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [generalMessages, setGeneralMessages] = useState<Message[]>([])
  const [itemMessages, setItemMessages] = useState<Record<string, Message[]>>({})
  const [itemUnreads, setItemUnreads] = useState<Record<string, number>>({})
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('detail')
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  // Load project list
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
  }, [session])

  // Load selected project data
  const loadProjectData = useCallback(() => {
    if (!session?.user || !selectedProjectId) return

    const project = projects.find(p => p.id === selectedProjectId)
    if (!project) return

    setSelectedProject(project)

    const items = getScheduleItemsForProject(selectedProjectId)
    setScheduleItems(items)

    const genMsgs = getMessagesForThread(selectedProjectId, null)
    setGeneralMessages(genMsgs)

    const msgMap: Record<string, Message[]> = {}
    const unreadMap: Record<string, number> = {}
    items.forEach(item => {
      msgMap[item.id] = getMessagesForThread(selectedProjectId, item.id)
      unreadMap[item.id] = getUnreadCountForThread(session.user.id, selectedProjectId, item.id)
    })
    setItemMessages(msgMap)
    setItemUnreads(unreadMap)

    setDailyLogs(getDailyLogsForProject(selectedProjectId))
  }, [session, selectedProjectId, projects])

  // Initial load
  useEffect(() => {
    if (!session?.user) return
    loadProjectList()

    // Check for pre-selected project from redirect
    const storedProjectId = sessionStorage.getItem('selectedProjectId')
    const storedTab = sessionStorage.getItem('activeTab') as ActiveTab | null
    const storedItemId = sessionStorage.getItem('selectedItemId')

    if (storedProjectId) {
      sessionStorage.removeItem('selectedProjectId')
      sessionStorage.removeItem('activeTab')
      sessionStorage.removeItem('selectedItemId')
      setSelectedProjectId(storedProjectId)
      if (storedTab) {
        setActiveTab(storedTab)
      }
      if (storedItemId) {
        setSelectedItemId(storedItemId)
        setViewMode('thread')
      }
    }

    setIsLoading(false)
  }, [session, loadProjectList])

  // Load project data when selection changes
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData()
    }
  }, [selectedProjectId, loadProjectData])

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setViewMode('detail')
    setActiveTab('schedule')
    setSelectedItemId(null)
  }

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab)
  }

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId)
    setViewMode('thread')
  }

  const handleBackFromThread = () => {
    setViewMode('detail')
    setSelectedItemId(null)
  }

  const handleDataChange = () => {
    loadProjectData()
    loadProjectList()
  }

  const handleItemDelete = () => {
    setViewMode('detail')
    setSelectedItemId(null)
    handleDataChange()
  }

  const selectedItem = selectedItemId
    ? scheduleItems.find(i => i.id === selectedItemId)
    : null

  const selectedItemMessages = selectedItemId
    ? itemMessages[selectedItemId] || []
    : []

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Project List */}
      <div className="w-[280px] shrink-0 border-r border-slate-200 bg-slate-50">
        <ProjectList
          projects={projects}
          selectedProjectId={selectedProjectId}
          unreadCounts={projectUnreadCounts}
          onSelectProject={handleSelectProject}
        />
      </div>

      {/* Right Panel - Project Detail or Thread */}
      <div className="flex-1 overflow-hidden bg-white">
        {!selectedProjectId ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-slate-900">Select a project</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a project from the list to view details</p>
          </div>
        ) : viewMode === 'thread' && selectedItem ? (
          <ThreadView
            projectId={selectedProjectId}
            scheduleItem={selectedItem}
            messages={selectedItemMessages}
            onBack={handleBackFromThread}
            onDataChange={handleDataChange}
            onDelete={handleItemDelete}
          />
        ) : selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            scheduleItems={scheduleItems}
            generalMessages={generalMessages}
            itemMessages={itemMessages}
            itemUnreads={itemUnreads}
            dailyLogs={dailyLogs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onSelectItem={handleSelectItem}
            onDataChange={handleDataChange}
          />
        ) : null}
      </div>
    </div>
  )
}
