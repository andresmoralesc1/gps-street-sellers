'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export function NotificationBell() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setUnread(data.unread_count || 0)
      })
      .catch(() => {})
  }, [])

  if (unread === 0) return null

  return (
    <Link href="/notifications" className="relative">
      <Bell size={22} className="text-gray-600 hover:text-primary transition-colors" />
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {unread > 9 ? '9+' : unread}
      </span>
    </Link>
  )
}
