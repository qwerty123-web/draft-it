// DraftIt: Claude for signed-in users, without putting an API key in the browser.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > Via editor,
// name it "claude", paste this file, Deploy. Then Edge Functions > Secrets > add
// ANTHROPIC_API_KEY with your key from console.anthropic.com.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELS: Record<string, string> = { quick: "claude-haiku-5-5", default: "claude-sonnet-5-5" };
const MAX_BODY = 8_000_000; // about 6 MB of images after base64

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  // Only real signed-in DraftIt accounts may use the key (not the public anon key on its own).
  const auth = req.headers.get("Authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const who = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!who.ok) return reply({ error: "sign_in_required" }, 401);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return reply({ error: "server_key_missing" }, 503);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return reply({ error: "too_large" }, 413);
  let body: { messages?: unknown; tier?: string };
  try { body = JSON.parse(raw); } catch { return reply({ error: "bad_json" }, 400); }
  if (!Array.isArray(body.messages) || body.messages.length === 0) return reply({ error: "bad_request" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELS[body.tier ?? "default"] ?? MODELS.default, max_tokens: 8000, messages: body.messages }),
  });
  return new Response(await r.text(), { status: r.status, headers: { ...CORS, "content-type": "application/json" } });
});
