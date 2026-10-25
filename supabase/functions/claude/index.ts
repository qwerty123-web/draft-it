// DraftIt: Claude for signed-in users, without putting an API key in the browser.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > Via editor,
// name it "claude", paste this file, Deploy. Then Edge Functions > Secrets > add
// ANTHROPIC_API_KEY with your key from platform.claude.com/settings/keys (create it inside a
// workspace; otherwise also add ANTHROPIC_WORKSPACE_ID with that workspace's ID).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELS: Record<string, string> = { quick: "claude-haiku-5-5", default: "claude-sonnet-5-5" };
const MAX_BODY = 8_000_000; // about 6 MB of images after base64
// Simple per-account limit so one account cannot run up the bill: 30 calls a minute.
const RATE = new Map<string, number[]>();
const tooMany = (id: string) => { const now = Date.now(), list = (RATE.get(id) ?? []).filter((t) => now - t < 60_000); list.push(now); RATE.set(id, list); return list.length > 30; };

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
  const user = await who.json().catch(() => null) as { id?: string } | null;
  if (!user?.id) return reply({ error: "sign_in_required" }, 401);
  if (tooMany(user.id)) return reply({ error: "rate_limited" }, 429);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return reply({ error: "server_key_missing" }, 503);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return reply({ error: "too_large" }, 413);
  let body: { messages?: unknown; tier?: string };
  try { body = JSON.parse(raw); } catch { return reply({ error: "bad_json" }, 400); }
  const okMsg = (m: unknown) => !!m && typeof m === "object" && ["user", "assistant"].includes((m as { role?: string }).role ?? "");
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 20 || !body.messages.every(okMsg)) return reply({ error: "bad_request" }, 400);
  if (body.tier !== undefined && !(body.tier in MODELS)) return reply({ error: "bad_request" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${key}`,
      "anthropic-version": "2023-06-01",
      // Only needed for a key that is not scoped to a workspace (optional secret).
      ...(Deno.env.get("ANTHROPIC_WORKSPACE_ID") ? { "anthropic-workspace-id": Deno.env.get("ANTHROPIC_WORKSPACE_ID")! } : {}),
    },
    body: JSON.stringify({ model: MODELS[body.tier ?? "default"] ?? MODELS.default, max_tokens: 8000, messages: body.messages }),
  });
  return new Response(await r.text(), { status: r.status, headers: { ...CORS, "content-type": "application/json" } });
});
