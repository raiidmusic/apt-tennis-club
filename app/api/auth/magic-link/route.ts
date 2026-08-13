import { accessCookie, isAdminEmail } from "../../../../lib/auth";
import { getAuthUser, runtimeEnv, sendMagicLink, SupabaseRequestError } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { action?: string; email?: string; accessToken?: string };
    if (payload.action === "request") {
      const email = payload.email?.trim().toLowerCase() || "";
      if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
      if (!isAdminEmail(email)) return Response.json({ sent: true });
      const publicUrl = runtimeEnv().APT_PUBLIC_URL?.replace(/\/$/, "");
      if (!publicUrl) return Response.json({ error: "A URL oficial ainda está sendo configurada." }, { status: 503 });
      await sendMagicLink(email, publicUrl);
      return Response.json({ sent: true });
    }

    const accessToken = payload.accessToken || "";
    if (payload.action !== "complete" || !accessToken) {
      return Response.json({ error: "Link de acesso inválido." }, { status: 400 });
    }
    const authUser = await getAuthUser(accessToken);
    const email = authUser?.email?.toLowerCase() || "";
    if (!authUser) {
      console.error("management_magic_link_denied", { reason: "token_validation_failed" });
      return Response.json({ error: "Este link expirou ou já foi usado." }, { status: 401 });
    }
    if (!isAdminEmail(email)) {
      console.error("management_magic_link_denied", { reason: "email_not_authorized" });
      return Response.json({ error: "Este link não tem acesso à gestão." }, { status: 403 });
    }
    return Response.json(
      { authenticated: true },
      { headers: { "Set-Cookie": accessCookie(accessToken) } },
    );
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    console.error("management_magic_link_failed", {
      kind: error instanceof SupabaseRequestError ? "supabase" : "unexpected",
      status: error instanceof SupabaseRequestError ? error.status : null,
    });
    const message = status === 503
      ? "A autenticação ainda está sendo configurada."
      : status === 429
        ? "Aguarde um minuto antes de solicitar outro link."
        : "Não foi possível concluir o acesso.";
    return Response.json({ error: message }, { status });
  }
}
