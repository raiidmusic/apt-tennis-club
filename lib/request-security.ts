import { runtimeEnv } from "./supabase-server";

function addOrigin(origins: Set<string>, value?: string, defaultProtocol = "") {
  if (!value) return;
  try {
    origins.add(new URL(value.includes("://") ? value : `${defaultProtocol}${value}`).origin);
  } catch {
    // A malformed deployment variable must not weaken the origin boundary.
  }
}

function allowedOrigins() {
  const origins = new Set<string>();
  addOrigin(origins, runtimeEnv().APT_PUBLIC_URL);
  addOrigin(origins, runtimeEnv().VERCEL_URL, "https://");
  if (runtimeEnv().NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

// Browser writes use the session cookie; reject cross-site requests before
// accepting their body. Provider webhooks authenticate independently.
export function requireTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && (origin === requestOrigin || allowedOrigins().has(origin))) return null;
  return Response.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
}
