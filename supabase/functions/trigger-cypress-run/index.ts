import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
Deno.serve(
  (req) =>
    new Response(
      JSON.stringify({
        error: "Use a central github-actions para disparar workflows.",
      }),
      {
        status: req.method === "OPTIONS" ? 200 : 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    ),
);
