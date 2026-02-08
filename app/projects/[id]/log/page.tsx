'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Project, DailyLog, WeatherCondition, ParsedLogData, ScheduleItem } from '@/types/models'
import {
  getProjectById,
  getDailyLogsForProject,
  getDailyLogByDate,
  upsertDailyLog,
  updateDailyLogParsedData,
  getScheduleItemsForProject,
  initializeStore,
} from '@/lib/store'

const weatherOptions: WeatherCondition[] = ['Clear', 'Cloudy', 'Rain', 'Snow', 'Hot', 'Cold']

const PLACEHOLDER_TEXT = `What happened today? Just type naturally...

Example: Cloudy morning, cleared up by noon. Had 12 guys on site - 4 from Martinez Electric, 8 from our crew. Finished pulling wire on 2nd floor, started on 3rd. Inspector came by at 2pm, passed rough-in on units 201-208. Waiting on dampers, supposed to be here Thursday. Mike from the GC stopped by asking about the delay on the roof - told him we're waiting on permit revision.`

export default function DailyLogPage() {
  const { data: session } = useSession()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [allLogs, setAllLogs] = useState<DailyLog[]>([])
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])

  // Editor state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [rawEntry, setRawEntry] = useState('')
  const [weather, setWeather] = useState<WeatherCondition | ''>('')
  const [crewCount, setCrewCount] = useState<string>('')
  const [visitors, setVisitors] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // AI parsing state
  const [parsedData, setParsedData] = useState<ParsedLogData | null>(null)
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoadRef = useRef(true)
  const lastParsedTextRef = useRef<string>('')

  const loadProject = useCallback(() => {
    if (!session?.user) return

    initializeStore()

    const proj = getProjectById(projectId)
    setProject(proj || null)

    const logs = getDailyLogsForProject(projectId)
    setAllLogs(logs)

    const items = getScheduleItemsForProject(projectId)
    setScheduleItems(items)

    setIsLoading(false)
  }, [session, projectId])

  // Load project on mount
  useEffect(() => {
    loadProject()
  }, [loadProject])

  // Load log for selected date
  useEffect(() => {
    if (isLoading) return

    isInitialLoadRef.current = true

    const existing = getDailyLogByDate(projectId, selectedDate)
    if (existing) {
      setRawEntry(existing.rawEntry)
      setWeather(existing.weather || '')
      setCrewCount(existing.crewCount != null ? String(existing.crewCount) : '')
      setVisitors(existing.visitors || '')
      setParsedData(existing.parsedData || null)
      setParseStatus(existing.parsedData ? 'done' : 'idle')
      lastParsedTextRef.current = existing.parsedData ? existing.rawEntry : ''
    } else {
      setRawEntry('')
      setWeather('')
      setCrewCount('')
      setVisitors('')
      setParsedData(null)
      setParseStatus('idle')
      lastParsedTextRef.current = ''
    }

    setSaveStatus('idle')

    // Allow initial load flag to clear after state settles
    requestAnimationFrame(() => {
      isInitialLoadRef.current = false
    })
  }, [selectedDate, isLoading, projectId])

  // Trigger AI parsing
  const triggerParsing = useCallback(async (text: string) => {
    if (text.trim().length < 50) return
    if (text === lastParsedTextRef.current) return

    setParseStatus('parsing')
    lastParsedTextRef.current = text

    try {
      const res = await fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawEntry: text,
          scheduleItems: scheduleItems.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
          })),
        }),
      })

      if (!res.ok) throw new Error('Parse failed')

      const data: ParsedLogData = await res.json()
      setParsedData(data)
      setParseStatus('done')

      // Persist parsed data
      updateDailyLogParsedData(projectId, selectedDate, data)
      setAllLogs(getDailyLogsForProject(projectId))

      // Auto-fill weather if user hasn't selected one
      if (data.weather && !weather) {
        const matched = weatherOptions.find(
          w => w.toLowerCase() === data.weather!.condition.toLowerCase()
        )
        if (matched) setWeather(matched)
      }

      // Auto-fill crew count if user hasn't entered one
      if (data.crew && data.crew.length > 0 && !crewCount) {
        const total = data.crew.reduce((sum, c) => sum + c.count, 0)
        if (total > 0) setCrewCount(String(total))
      }
    } catch {
      setParseStatus('error')
    }
  }, [scheduleItems, projectId, selectedDate, weather, crewCount])

  // Debounced auto-save
  useEffect(() => {
    // Don't save during initial load
    if (isInitialLoadRef.current) return
    // Don't save if nothing to save
    if (!rawEntry.trim() && !weather && !crewCount && !visitors) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

    setSaveStatus('idle')

    debounceRef.current = setTimeout(() => {
      setSaveStatus('saving')

      upsertDailyLog(projectId, selectedDate, {
        rawEntry,
        weather: weather || undefined,
        crewCount: crewCount ? parseInt(crewCount, 10) : undefined,
        visitors: visitors || undefined,
      })

      // Refresh the log list
      setAllLogs(getDailyLogsForProject(projectId))

      setSaveStatus('saved')
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)

      // Trigger AI parsing after save
      triggerParsing(rawEntry)
    }, 2000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [rawEntry, weather, crewCount, visitors, projectId, selectedDate, triggerParsing])

  const formatLogDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const truncate = (text: string, maxLen = 100) => {
    if (text.length <= maxLen) return text
    return text.substring(0, maxLen).trim() + '...'
  }

  if (isLoading) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex h-64 items-center justify-center text-text-muted">
            Loading...
          </div>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/projects" className="mb-4 inline-block text-cg-blue hover:text-blue-300">
            &larr; Back to Projects
          </Link>
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <h3 className="text-lg font-medium text-text-primary">Project not found</h3>
          </div>
        </div>
      </main>
    )
  }

  const hasInsights = parsedData && (
    parsedData.weather || parsedData.crew?.length || parsedData.deliveries?.length ||
    parsedData.inspections?.length || parsedData.delays?.length || parsedData.workCompleted?.length
  )

  return (
    <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-cg-blue hover:text-blue-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          <p className="text-sm text-text-muted">Daily Log</p>
        </div>

        {/* Date picker + History toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-secondary">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setShowHistory(false)
              }}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <span className="text-sm text-text-secondary">{formatLogDate(selectedDate)}</span>
          <div className="ml-auto">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                showHistory
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-text-secondary hover:bg-card'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? 'Back to Editor' : 'View History'}
            </button>
          </div>
        </div>

        {showHistory ? (
          /* History View */
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Past Entries</h2>
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0])
                  setShowHistory(false)
                }}
                className="text-sm text-accent hover:text-amber-400"
              >
                Go to today
              </button>
            </div>

            {allLogs.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-text-muted">No log entries yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allLogs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => {
                      setSelectedDate(log.date)
                      setShowHistory(false)
                    }}
                    className="w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-accent/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-text-primary">{formatShortDate(log.date)}</span>
                          {log.weather && (
                            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs text-slate-400">{log.weather}</span>
                          )}
                          {log.crewCount != null && (
                            <span className="text-xs text-text-muted">{log.crewCount} crew</span>
                          )}
                          {log.parsedData && (
                            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-cg-purple">AI parsed</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{truncate(log.rawEntry)}</p>
                      </div>
                      <svg className="mt-1 h-4 w-4 flex-shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Editor View */
          <div>
            {/* Optional fields */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Weather</label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as WeatherCondition | '')}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">-- Select --</option>
                  {weatherOptions.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Crew Count</label>
                <input
                  type="number"
                  min={0}
                  value={crewCount}
                  onChange={(e) => setCrewCount(e.target.value)}
                  placeholder="e.g., 12"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Visitors</label>
                <input
                  type="text"
                  value={visitors}
                  onChange={(e) => setVisitors(e.target.value)}
                  placeholder="e.g., Inspector, GC rep"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Main textarea */}
            <div className="relative">
              <textarea
                value={rawEntry}
                onChange={(e) => setRawEntry(e.target.value)}
                placeholder={PLACEHOLDER_TEXT}
                className="min-h-[300px] w-full resize-y rounded-lg border border-border bg-input px-4 py-3 text-sm leading-relaxed text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Save status */}
            <div className="mt-2 flex items-center justify-end gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-text-muted">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 text-cg-green">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>

            {/* AI Insights Panel */}
            {(parseStatus === 'parsing' || hasInsights || parseStatus === 'error') && (
              <div className="mt-6 rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                {/* Header */}
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-cg-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-cg-purple">AI Insights</h3>
                  {parseStatus === 'parsing' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-purple-400">
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing your entry...
                    </span>
                  )}
                </div>

                {parseStatus === 'error' && (
                  <p className="text-xs text-purple-300">Couldn&apos;t analyze entry. Your log is saved.</p>
                )}

                {parsedData && hasInsights && (
                  <div className="space-y-4">
                    {/* Weather */}
                    {parsedData.weather && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-purple-400">Weather</div>
                        <p className="text-sm text-text-secondary">
                          <span className="text-text-primary">{parsedData.weather.condition}</span> — {parsedData.weather.details}
                        </p>
                      </div>
                    )}

                    {/* Crew Breakdown */}
                    {parsedData.crew && parsedData.crew.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-purple-400">Crew</div>
                        <div className="text-sm text-text-secondary">
                          <div className="mb-1 font-medium text-text-primary">
                            {parsedData.crew.reduce((sum, c) => sum + c.count, 0)} total
                          </div>
                          <div className="space-y-0.5">
                            {parsedData.crew.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-text-secondary">{c.company}{c.role ? ` \u2014 ${c.role}` : ''}</span>
                                <span className="font-medium text-text-primary">{c.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Deliveries */}
                    {parsedData.deliveries && parsedData.deliveries.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-purple-400">Deliveries & Materials</div>
                        <div className="space-y-1">
                          {parsedData.deliveries.map((d, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-text-primary">{d.material}</span>
                              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                                d.status === 'Delivered' ? 'bg-green-500/15 text-cg-green' :
                                d.status === 'Delayed' ? 'bg-red-500/15 text-cg-red' :
                                'bg-yellow-500/15 text-yellow-400'
                              }`}>
                                {d.status}
                              </span>
                              {d.details && <span className="ml-2 text-text-secondary">{d.details}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inspections */}
                    {parsedData.inspections && parsedData.inspections.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-purple-400">Inspections</div>
                        <div className="space-y-1">
                          {parsedData.inspections.map((insp, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-text-primary">{insp.inspector}</span>
                              <span className="mx-1 text-text-muted">&mdash;</span>
                              <span className="text-text-secondary">{insp.area}</span>
                              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                                insp.result === 'Passed' ? 'bg-green-500/15 text-cg-green' :
                                insp.result === 'Failed' ? 'bg-red-500/15 text-cg-red' :
                                'bg-yellow-500/15 text-yellow-400'
                              }`}>
                                {insp.result}
                              </span>
                              {insp.details && <span className="ml-2 text-text-secondary">{insp.details}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delays */}
                    {parsedData.delays && parsedData.delays.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-purple-400">Delays & Issues</div>
                        <div className="space-y-1">
                          {parsedData.delays.map((d, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-text-primary">{d.issue}</span>
                              {d.impact && <span className="ml-1 text-text-secondary">&mdash; {d.impact}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Completed */}
                    {parsedData.workCompleted && parsedData.workCompleted.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-purple-400">Work Completed</div>
                        <div className="space-y-1">
                          {parsedData.workCompleted.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-cg-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <div>
                                <span className="text-text-primary">{w.description}</span>
                                {w.location && <span className="ml-1 text-text-secondary">({w.location})</span>}
                                {w.scheduleItemId && w.scheduleItemTitle && (
                                  <Link
                                    href={`/projects/${projectId}/item/${w.scheduleItemId}`}
                                    className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-cg-blue hover:bg-blue-500/25"
                                  >
                                    {w.scheduleItemTitle}
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
