import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Exige um usuário LOGADO (JWT de sessão). A chave anon pública (que fica no
 * bundle do front) NÃO é aceita: ela passa no verify_jwt do Supabase, mas
 * não identifica nenhum usuário, então getUser() falha e devolvemos 401.
 * Retorna uma Response de erro, ou null se estiver autorizado.
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  const deny = () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (!token) return deny();
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? deny() : null;
}

/** Comparação de segredos em tempo constante (evita timing attack). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ (y[i] ?? 0);
  return diff === 0;
}
