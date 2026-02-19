'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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
  const busyRef = useRef(false) // guard against rapid taps

  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    setSupported(hasSpeech)
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch { /* ignore */ }
  }, [])

  const start = useCallback(() => {
    if (!supported || disabled || busyRef.current) return
    if (recognitionRef.current) return // already running

    busyRef.current = true

    const w = window as any
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setSupported(false)
      busyRef.current = false
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    transcriptRef.current = ''

    recognition.onstart = () => {
      busyRef.current = false
    }

    recognition.onresult = (event: any) => {
      let final = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        }
      }
      if (final) transcriptRef.current = final
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error)
      }
      recognitionRef.current = null
      busyRef.current = false
      setMicState('idle')
    }

    recognition.onend = () => {
      const text = transcriptRef.current.trim()
      recognitionRef.current = null
      if (text) {
        setMicState('processing')
        onTranscript(text)
        setTimeout(() => {
          setMicState('idle')
          busyRef.current = false
        }, 400)
      } else {
        setMicState('idle')
        busyRef.current = false
      }
    }

    recognitionRef.current = recognition
    setMicState('listening') // set immediately, don't wait for onstart

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      busyRef.current = false
      setMicState('idle')
    }
  }, [supported, disabled, onTranscript])

  const handleClick = useCallback(() => {
    if (busyRef.current) return
    // Use the ref (sync) not micState (async) to decide
    if (recognitionRef.current) {
      busyRef.current = true
      stop()
    } else {
      start()
    }
  }, [start, stop])

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
            <span className="text-xs text-text-muted">Voice not supported</span>
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
            disabled={disabled || micState === 'processing'}
            onClick={handleClick}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              micState === 'listening'
                ? 'animate-pulse bg-red-500/20 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.3)] ring-2 ring-red-500/40'
                : micState === 'processing'
                  ? 'bg-amber-500/20 text-amber-400'
                  : disabled
                    ? 'cursor-not-allowed bg-card text-text-muted opacity-50'
                    : 'bg-card text-text-muted hover:bg-input hover:text-text-secondary active:scale-95'
            }`}
          >
            {micState === 'processing' ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : micState === 'listening' ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <span className={`text-xs ${micState === 'listening' ? 'text-red-400 font-medium' : 'text-text-muted'}`}>
            {micState === 'listening'
              ? 'Tap to stop'
              : micState === 'processing'
                ? 'Processing...'
                : 'Tap to talk'}
          </span>
        </div>
      </div>
    </div>
  )
}
