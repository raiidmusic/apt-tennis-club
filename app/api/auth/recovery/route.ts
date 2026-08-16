import { isValidNewPassword } from "../../../../lib/auth";
import { requireTrustedOrigin } from "../../../../lib/request-security";
import { resetPasswordWithRecoveryToken, runtimeEnv, sendPasswordRecovery, SupabaseRequestError } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  try {
    const payload = await request.json() as { action?: string; email?: string; password?: string; accessToken?: string };
    if (payload.action === "request") {
      const email = payload.email?.trim().toLowerCase() || "";
      if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
      const publicUrl = runtimeEnv().APT_PUBLIC_URL?.replace(/\/$/, "");
      if (!publicUrl) return Response.json({ error: "A URL oficial ainda está sendo configurada." }, { status: 503 });
      await sendPasswordRecovery(email, `${publicUrl}/redefinir-senha`);
      return Response.json({ sent: true });
    }

    const password = payload.password || "";
    const accessToken = payload.accessToken || "";
    if (payload.action !== "reset" || !isValidNewPassword(password) || !accessToken) {
      return Response.json({ error: "Use uma senha com pelo menos 8 caracteres." }, { status: 400 });
    }
    await resetPasswordWithRecoveryToken(accessToken, password);
    return Response.json({ reset: true });
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    return Response.json({ error: status === 503 ? "A autenticação ainda está sendo configurada." : "Não foi possível concluir a recuperação." }, { status });
  }
}
