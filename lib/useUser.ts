'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type StaffUser = {
  id: string
  name: string
  email: string
  role: string
  job_title: string
  must_reset_password: boolean
}

export function useUser() {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      // Get the logged-in auth user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      // Match them to the staff table by email
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, email, role, job_title, must_reset_password')
        .eq('email', session.user.email)
        .single()

      if (staffData) setUser(staffData)
      setLoading(false)
    }
    getUser()

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) { setUser(null); setLoading(false); return }
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, email, role, job_title, must_reset_password')
        .eq('email', session.user.email)
        .single()
      if (staffData) setUser(staffData)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}