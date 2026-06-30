import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

export async function POST(request: NextRequest) {
  // ── 1. Verify caller has a valid session ─────────────────────────────────────
  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user: caller }, error: callerErr } = await anonClient.auth.getUser(token)
  if (callerErr || !caller?.email)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── 2. Confirm caller is an admin ────────────────────────────────────────────
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: callerRecord } = await adminClient
    .from('staff')
    .select('role')
    .eq('email', caller.email)
    .single()

  if (!callerRecord || !['admin', 'training_admin'].includes(callerRecord.role))
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })

  // ── 3. Parse request ─────────────────────────────────────────────────────────
  let name: string, email: string, jobTitle: string, role: string, deptIds: string[]
  try { ({ name, email, jobTitle, role, deptIds } = await request.json()) }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  if (!name || !email)
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })

  const tempPassword = generateTempPassword()

  // ── 4. Create or update Supabase Auth account ────────────────────────────────
  const { error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // no verification email — admin is setting this up directly
  })

  if (createErr) {
    // If the auth account already exists, just set a fresh temp password on it
    if (createErr.message?.toLowerCase().includes('already') || (createErr as { code?: string }).code === 'email_exists') {
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const existing = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(existing.id, { password: tempPassword })
        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
  }

  // ── 5. Insert staff table record ─────────────────────────────────────────────
  const { data: staffData, error: staffErr } = await adminClient
    .from('staff')
    .insert({ name, email, job_title: jobTitle || '', role: role || 'sw', active: true, must_reset_password: true })
    .select()
    .single()

  if (staffErr)
    return NextResponse.json({ error: staffErr.message }, { status: 500 })

  // ── 6. Assign departments ────────────────────────────────────────────────────
  if (deptIds?.length > 0) {
    await adminClient
      .from('staff_departments')
      .insert(deptIds.map((d: string) => ({ staff_id: staffData.id, department_id: d })))
  }

  return NextResponse.json({ tempPassword, staffId: staffData.id })
}
