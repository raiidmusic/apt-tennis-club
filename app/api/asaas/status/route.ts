import { requireAdmin } from "../../../../lib/auth";
import { asaasRequest } from "../../../../lib/asaas";

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const response = await asaasRequest("/myAccount/accountNumber", { cache: "no-store" });
    return Response.json({ configured: true, connected: response.ok });
  } catch {
    return Response.json({ configured: false, connected: false });
  }
}
