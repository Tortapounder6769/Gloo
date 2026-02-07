'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    {
      href: '/projects',
      label: 'Projects',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      href: '/projects',
      label: 'Schedule',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      href: '/log',
      label: 'Daily Log',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
      isAmber: true,
    },
  ]

  const userInitials = session?.user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="flex h-full w-16 flex-col bg-slate-800">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          CG
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-2 py-4">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={index}
              href={item.href}
              title={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? item.isAmber
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-white'
                  : item.isAmber
                    ? 'text-amber-400 hover:bg-slate-700 hover:text-amber-300'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.icon}
            </Link>
          )
        })}
      </nav>

      {/* User Avatar */}
      <div className="relative flex flex-col items-center pb-4">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-medium text-white transition-colors hover:bg-slate-500"
          title={session?.user?.name || 'User'}
        >
          {userInitials}
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute bottom-14 left-2 z-20 w-48 rounded-lg bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="px-4 py-2 text-sm text-gray-700">
                <div className="font-medium">{session?.user?.name}</div>
                <div className="text-xs text-gray-500">{session?.user?.email}</div>
              </div>
              <hr className="my-1" />
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
