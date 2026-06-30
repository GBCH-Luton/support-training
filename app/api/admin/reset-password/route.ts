import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Generates a readable temp password — avoids confusable characters (0, O, I, l, 1)
// so the admin can read it aloud over the phone without ambiguity.
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

  // Use the anon key to verify the session token — this is safe
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user: caller }, error: callerErr } = await anonClient.auth.getUser(token)
  if (callerErr || !caller?.email) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── 2. Confirm caller is an admin (using service role to bypass RLS) ─────────
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: callerRecord } = await adminClient
    .from('staff')
    .select('role')
    .eq('email', caller.email)
    .single()

  if (!callerRecord || !['admin', 'training_admin'].includes(callerRecord.role)) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
  }

  // ── 3. Parse and validate the request body ───────────────────────────────────
  let staffId: string, email: string
  try {
    ({ staffId, email } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!staffId || !email) {
    return NextResponse.json({ error: 'Missing staffId or email' }, { status: 400 })
  }

  // ── 4. Find the target user in Supabase Auth ─────────────────────────────────
  // We list users and match by email because we don't store the auth UUID in the
  // staff table. Fine for small orgs; paginate if headcount exceeds ~500.
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    return NextResponse.json({ error: 'Failed to look up users' }, { status: 500 })
  }

  const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!targetUser) {
    return NextResponse.json(
      { error: `No login account found for ${email}. This staff member may not have signed in yet — ask them to use the "Forgot password" email link for their first login, then you can use this reset tool for future resets.` },
      { status: 404 }
    )
  }

  // ── 5. Generate the temp password and set it in Supabase Auth ────────────────
  const tempPassword = generateTempPassword()
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(
    targetUser.id,
    { password: tempPassword }
  )
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // ── 6. Flag the staff record — login will redirect them to /reset-password ───
  await adminClient
    .from('staff')
    .update({ must_reset_password: true })
    .eq('id', staffId)

  // ── 7. Return the temp password — shown once, never stored in plain text ──────
  return NextResponse.json({ tempPassword })
}
