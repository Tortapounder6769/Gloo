'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirect old item thread URLs to the new two-column layout
export default function ItemThreadRedirect() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const itemId = params.itemId as string

  useEffect(() => {
    if (projectId && itemId) {
      sessionStorage.setItem('selectedProjectId', projectId)
      sessionStorage.setItem('selectedItemId', itemId)
      router.replace('/projects')
    }
  }, [projectId, itemId, router])

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-slate-500">Redirecting...</p>
    </div>
  )
}
