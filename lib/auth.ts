import { getAuthUser, runtimeEnv, supabaseAdmin } from "./supabase-server";

const ACCESS_COOKIE = "apt_access_token";
const MASTER_ADMIN_EMAILS = new Set([
  "apttennisexclusive@gmail.com",
  "gaagustavo@gmail.com",
]);

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
  const normalizedEmail = email.trim().toLowerCase();
  if (MASTER_ADMIN_EMAILS.has(normalizedEmail)) return true;
  return new Set(
    (runtimeEnv().APT_ADMIN_EMAILS || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  ).has(normalizedEmail);
}

export function isValidNewPassword(password: string) {
  return password.length >= 8 && password.length <= 128 && password.trim().length > 0;
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
