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
      <main className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex h-64 items-center justify-center text-gray-500">
            Loading...
          </div>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/projects" className="mb-4 inline-block text-blue-600 hover:text-blue-800 hover:underline">
            ← Back to Projects
          </Link>
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
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
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-gray-500">Daily Log</p>
        </div>

        {/* Date picker + History toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setShowHistory(false)
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <span className="text-sm text-gray-500">{formatLogDate(selectedDate)}</span>
          <div className="ml-auto">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                showHistory
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
              <h2 className="text-lg font-semibold">Past Entries</h2>
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0])
                  setShowHistory(false)
                }}
                className="text-sm text-amber-700 hover:text-amber-900 hover:underline"
              >
                Go to today
              </button>
            </div>

            {allLogs.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500">No log entries yet.</p>
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
                    className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">{formatShortDate(log.date)}</span>
                          {log.weather && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{log.weather}</span>
                          )}
                          {log.crewCount != null && (
                            <span className="text-xs text-gray-400">{log.crewCount} crew</span>
                          )}
                          {log.parsedData && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-600">AI parsed</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{truncate(log.rawEntry)}</p>
                      </div>
                      <svg className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Weather</label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as WeatherCondition | '')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Select --</option>
                  {weatherOptions.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Crew Count</label>
                <input
                  type="number"
                  min={0}
                  value={crewCount}
                  onChange={(e) => setCrewCount(e.target.value)}
                  placeholder="e.g., 12"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Visitors</label>
                <input
                  type="text"
                  value={visitors}
                  onChange={(e) => setVisitors(e.target.value)}
                  placeholder="e.g., Inspector, GC rep"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Main textarea */}
            <div className="relative">
              <textarea
                value={rawEntry}
                onChange={(e) => setRawEntry(e.target.value)}
                placeholder={PLACEHOLDER_TEXT}
                className="min-h-[300px] w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-relaxed focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Save status */}
            <div className="mt-2 flex items-center justify-end gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 text-green-600">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>

            {/* AI Insights Panel */}
            {(parseStatus === 'parsing' || hasInsights || parseStatus === 'error') && (
              <div className="mt-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
                {/* Header */}
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-violet-900">AI Insights</h3>
                  {parseStatus === 'parsing' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-violet-600">
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing your entry...
                    </span>
                  )}
                </div>

                {parseStatus === 'error' && (
                  <p className="text-xs text-violet-700">Couldn&apos;t analyze entry. Your log is saved.</p>
                )}

                {parsedData && hasInsights && (
                  <div className="space-y-4">
                    {/* Weather */}
                    {parsedData.weather && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-violet-700">Weather</div>
                        <p className="text-sm text-gray-700">
                          {parsedData.weather.condition} — <span className="text-gray-500">{parsedData.weather.details}</span>
                        </p>
                      </div>
                    )}

                    {/* Crew Breakdown */}
                    {parsedData.crew && parsedData.crew.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-violet-700">Crew</div>
                        <div className="text-sm text-gray-700">
                          <div className="mb-1 font-medium">
                            {parsedData.crew.reduce((sum, c) => sum + c.count, 0)} total
                          </div>
                          <div className="space-y-0.5">
                            {parsedData.crew.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{c.company}{c.role ? ` — ${c.role}` : ''}</span>
                                <span className="font-medium text-gray-900">{c.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Deliveries */}
                    {parsedData.deliveries && parsedData.deliveries.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-violet-700">Deliveries & Materials</div>
                        <div className="space-y-1">
                          {parsedData.deliveries.map((d, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-gray-900">{d.material}</span>
                              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                                d.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                d.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {d.status}
                              </span>
                              {d.details && <span className="ml-2 text-gray-500">{d.details}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inspections */}
                    {parsedData.inspections && parsedData.inspections.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-violet-700">Inspections</div>
                        <div className="space-y-1">
                          {parsedData.inspections.map((insp, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-gray-900">{insp.inspector}</span>
                              <span className="mx-1 text-gray-400">—</span>
                              <span className="text-gray-700">{insp.area}</span>
                              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                                insp.result === 'Passed' ? 'bg-green-100 text-green-800' :
                                insp.result === 'Failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {insp.result}
                              </span>
                              {insp.details && <span className="ml-2 text-gray-500">{insp.details}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delays */}
                    {parsedData.delays && parsedData.delays.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-violet-700">Delays & Issues</div>
                        <div className="space-y-1">
                          {parsedData.delays.map((d, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-gray-900">{d.issue}</span>
                              {d.impact && <span className="ml-1 text-gray-500">— {d.impact}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Completed */}
                    {parsedData.workCompleted && parsedData.workCompleted.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase text-violet-700">Work Completed</div>
                        <div className="space-y-1">
                          {parsedData.workCompleted.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <div>
                                <span className="text-gray-900">{w.description}</span>
                                {w.location && <span className="ml-1 text-gray-500">({w.location})</span>}
                                {w.scheduleItemId && w.scheduleItemTitle && (
                                  <Link
                                    href={`/projects/${projectId}/item/${w.scheduleItemId}`}
                                    className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
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
