'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirect old general thread URLs to the new two-column layout
export default function GeneralThreadRedirect() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      sessionStorage.setItem('selectedProjectId', projectId)
      sessionStorage.setItem('activeTab', 'general')
      router.replace('/projects')
    }
  }, [projectId, router])

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-slate-500">Redirecting...</p>
    </div>
  )
}
