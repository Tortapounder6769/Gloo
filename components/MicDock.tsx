'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// Web Speech API types — browser-only API, types not always available in TS.
// We use `any` for the recognition instance to avoid missing type errors at compile time.
/* eslint-disable @typescript-eslint/no-explicit-any */

interface MicDockProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

type MicState = 'idle' | 'listening' | 'processing'

export default function MicDock({ onTranscript, disabled }: MicDockProps) {
  const [micState, setMicState] = useState<MicState>('idle')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    setSupported(hasSpeech)
  }, [])

  const startListening = useCallback(() => {
    if (!supported || disabled) return

    const w = window as any
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    transcriptRef.current = ''

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      transcriptRef.current = finalTranscript
    }

    recognition.onerror = () => {
      setMicState('idle')
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setMicState('processing')
      const text = transcriptRef.current.trim()
      if (text) {
        onTranscript(text)
      }
      recognitionRef.current = null
      // Brief processing state then back to idle
      setTimeout(() => setMicState('idle'), 300)
    }

    recognitionRef.current = recognition
    recognition.start()
    setMicState('listening')
  }, [supported, disabled, onTranscript])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    startListening()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    stopListening()
  }

  // Prevent context menu on long press (mobile)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  if (!supported) {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border border-border bg-card px-6 py-3">
          <div className="flex flex-col items-center gap-1" title="Voice input not supported in this browser">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-text-muted opacity-50">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-xs text-text-muted">Not supported</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="rounded-lg border border-border bg-card px-6 py-3">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={stopListening}
            onContextMenu={handleContextMenu}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all select-none ${
              micState === 'listening'
                ? 'animate-pulse bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : micState === 'processing'
                  ? 'bg-amber-500/20 text-amber-400'
                  : disabled
                    ? 'cursor-not-allowed bg-card text-text-muted opacity-50'
                    : 'bg-card text-text-muted hover:bg-input hover:text-text-secondary'
            }`}
          >
            {micState === 'processing' ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <span className="text-xs text-text-muted">
            {micState === 'listening'
              ? 'Listening...'
              : micState === 'processing'
                ? 'Processing...'
                : 'Hold to talk'}
          </span>
        </div>
      </div>
    </div>
  )
}
