'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project } from '@/types/models'
import { getProjectById, createSubLog, initializeStore } from '@/lib/store'
import MicDock from '@/components/MicDock'
import PromptPills from '@/components/PromptPills'

export default function SubmitLogPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [transcript, setTranscript] = useState('')
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const loadProject = useCallback(() => {
    if (!session?.user) return
    initializeStore()
    const proj = getProjectById(projectId)
    setProject(proj || null)
    setIsLoading(false)
  }, [session, projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const handleVoiceTranscript = (text: string) => {
    setTranscript(prev => {
      const separator = prev.trim() ? ' ' : ''
      return prev + separator + text
    })
  }

  const handlePromptInsert = (text: string) => {
    setTranscript(prev => prev + text)
  }

  const handleSubmit = async () => {
    if (!transcript.trim() || !session?.user || isSubmitting) return

    setIsSubmitting(true)

    let translatedTranscript: string | undefined

    // If language is Spanish, translate to English
    if (language === 'es') {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, from: 'es', to: 'en' }),
        })
        if (res.ok) {
          const data = await res.json()
          translatedTranscript = data.translated
        }
      } catch {
        // Translation failed — still submit without translation
      }
    }

    createSubLog(
      projectId,
      selectedDate,
      session.user.id,
      session.user.name,
      session.user.role,
      transcript.trim(),
      language,
      translatedTranscript
    )

    setIsSubmitting(false)
    setSubmitted(true)
  }

  if (isLoading) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex h-64 items-center justify-center text-text-muted">Loading...</div>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
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

  if (submitted) {
    return (
      <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                <svg className="h-6 w-6 text-cg-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Log Submitted</h3>
            <p className="mt-1 text-sm text-text-muted">Your daily log has been submitted for review.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSubmitted(false)
                  setTranscript('')
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-card transition-colors"
              >
                Submit Another
              </button>
              <Link
                href={`/projects/${projectId}?channel=general`}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-dark hover:bg-amber-500 transition-colors"
              >
                Back to Project
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto bg-main p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
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
          <p className="text-sm text-text-muted">Submit Daily Log</p>
        </div>

        {/* Date + Language */}
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-secondary">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-secondary">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="en">English</option>
              <option value="es">Espa&ntilde;ol</option>
            </select>
          </div>
        </div>

        {/* Prompt pills */}
        {transcript.trim().length < 20 && (
          <div className="mb-3">
            <PromptPills onInsert={handlePromptInsert} />
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={language === 'es'
            ? '¿Qué hicieron hoy? Escribe o usa el micrófono...'
            : 'What did your crew do today? Type or use the mic...'}
          className="min-h-[200px] w-full resize-y rounded-lg border border-border bg-input px-4 py-3 text-sm leading-relaxed text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {/* Mic dock */}
        <div className="mt-3">
          <MicDock onTranscript={handleVoiceTranscript} />
        </div>

        {/* Submit button */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href={`/projects/${projectId}?channel=general`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-card transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!transcript.trim() || isSubmitting}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              !transcript.trim() || isSubmitting
                ? 'cursor-not-allowed bg-card text-text-muted'
                : 'bg-accent text-dark hover:bg-amber-500'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Log'}
          </button>
        </div>
      </div>
    </main>
  )
}
