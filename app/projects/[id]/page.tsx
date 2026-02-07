'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirect old project detail URLs to the new two-column layout
export default function ProjectDetailRedirect() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  useEffect(() => {
    // Store the selected project ID in sessionStorage for the projects page to pick up
    if (projectId) {
      sessionStorage.setItem('selectedProjectId', projectId)
      router.replace('/projects')
    }
  }, [projectId, router])

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-slate-500">Redirecting...</p>
    </div>
  )
}
