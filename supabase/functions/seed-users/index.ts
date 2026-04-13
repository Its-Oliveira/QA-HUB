import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const users = [
    { email: 'leonardo.tadeu@orcafascio.com', password: 'admin123' },
    { email: 'caio.oliveira@orcafascio.com', password: 'admin123' },
  ]

  const results = []
  for (const u of users) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })
    results.push({ email: u.email, success: !error, error: error?.message, id: data?.user?.id })
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
})
