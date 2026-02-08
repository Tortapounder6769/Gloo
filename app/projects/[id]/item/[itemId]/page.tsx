'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirect item thread URLs to the channel-based layout
export default function ItemThreadRedirect() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const itemId = params.itemId as string

  useEffect(() => {
    if (projectId && itemId) {
      router.replace(`/projects/${projectId}?channel=schedule&item=${itemId}`)
    }
  }, [projectId, itemId, router])

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-text-muted">Redirecting...</p>
    </div>
  )
}
