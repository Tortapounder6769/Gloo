'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirect general thread URLs to the channel-based layout
export default function GeneralThreadRedirect() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}?channel=general`)
    }
  }, [projectId, router])

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-text-muted">Redirecting...</p>
    </div>
  )
}
