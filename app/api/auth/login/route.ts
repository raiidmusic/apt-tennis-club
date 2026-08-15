import { accessCookie } from "../../../../lib/auth";
import { requireTrustedOrigin } from "../../../../lib/request-security";
import { signInWithPassword, SupabaseRequestError } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  try {
    const payload = await request.json() as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase() || "";
    const password = payload.password || "";
    if (!email || password.length < 8) {
      return Response.json({ error: "Informe seu e-mail e sua senha." }, { status: 400 });
    }
    const session = await signInWithPassword(email, password);
    return Response.json(
      { authenticated: true },
      { headers: { "Set-Cookie": accessCookie(session.access_token!, session.expires_in || 3600) } },
    );
  } catch (error) {
    const status = error instanceof SupabaseRequestError && error.status === 503 ? 503 : 401;
    return Response.json({ error: status === 503 ? "A autenticação ainda está sendo configurada." : "E-mail ou senha inválidos." }, { status });
  }
}
