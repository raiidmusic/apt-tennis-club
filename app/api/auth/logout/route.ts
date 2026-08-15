import { clearAccessCookie } from "../../../../lib/auth";
import { requireTrustedOrigin } from "../../../../lib/request-security";

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": clearAccessCookie() } });
}
