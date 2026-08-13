import { getAuthUser, runtimeEnv, supabaseAdmin } from "./supabase-server";

const ACCESS_COOKIE = "apt_access_token";

export type SessionUser = {
  id: string;
  email: string;
  role: "admin" | "member";
  memberId?: string;
};

function parseCookies(request: Request) {
  return Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const index = entry.indexOf("=");
        return [entry.slice(0, index), decodeURIComponent(entry.slice(index + 1))];
      }),
  );
}

export function accessCookie(token: string, maxAge = 3600) {
  return `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}

export function clearAccessCookie() {
  return `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

export function isAdminEmail(email: string) {
  return new Set(
    (runtimeEnv().APT_ADMIN_EMAILS || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  ).has(email.trim().toLowerCase());
}

export async function getSession(request: Request): Promise<SessionUser | null> {
  const accessToken = parseCookies(request)[ACCESS_COOKIE];
  if (!accessToken) return null;
  const authUser = await getAuthUser(accessToken);
  const email = authUser?.email?.toLowerCase();
  if (!authUser || !email) return null;

  if (isAdminEmail(email)) return { id: authUser.id, email, role: "admin" };

  const members = await supabaseAdmin<Array<{ id: string }>>("members", {
    query: { select: "id", auth_user_id: `eq.${authUser.id}`, limit: "1" },
  });
  if (!members[0]) return null;
  return { id: authUser.id, email, role: "member", memberId: members[0].id };
}

export async function requireAdmin(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return null;
  return session;
}
