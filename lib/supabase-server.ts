type RuntimeEnv = Record<string, string | undefined>;

export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function runtimeEnv() {
  return process.env as RuntimeEnv;
}

function supabasePublicConfig() {
  const currentEnv = runtimeEnv();
  const url = currentEnv.SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey =
    currentEnv.SUPABASE_PUBLISHABLE_KEY ||
    currentEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    currentEnv.SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new SupabaseRequestError("Supabase público não configurado.", 503);
  }

  return { url, publishableKey };
}

function supabaseAdminConfig() {
  const { url, publishableKey } = supabasePublicConfig();
  const secretKey = runtimeEnv().SUPABASE_SECRET_KEY;
  if (!secretKey) throw new SupabaseRequestError("Supabase administrativo não configurado.", 503);
  return { url, publishableKey, secretKey };
}

function supabaseSecretHeaders(secretKey: string) {
  return { apikey: secretKey };
}

type AdminRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
  prefer?: string;
  single?: boolean;
};

export async function supabaseAdmin<T>(
  resource: string,
  options: AdminRequestOptions = {},
): Promise<T> {
  const { url, secretKey } = supabaseAdminConfig();
  const query = new URLSearchParams(options.query);
  const response = await fetch(`${url}/rest/v1/${resource}${query.size ? `?${query}` : ""}`, {
    method: options.method || "GET",
    headers: {
      ...supabaseSecretHeaders(secretKey),
      Accept: options.single ? "application/vnd.pgrst.object+json" : "application/json",
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new SupabaseRequestError(
      payload?.message || payload?.error_description || "Falha ao acessar o Supabase.",
      response.status,
      payload,
    );
  }
  return payload as T;
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  name: string;
  memberId: string;
}) {
  const { url, secretKey } = supabaseAdminConfig();
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      ...supabaseSecretHeaders(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name, member_id: input.memberId },
    }),
  });
  const payload = await response.json() as { id?: string; msg?: string; message?: string };
  if (!response.ok || !payload.id) {
    throw new SupabaseRequestError(payload.msg || payload.message || "Não foi possível criar o acesso.", response.status);
  }
  return payload.id;
}

export async function deleteAuthUser(userId: string) {
  const { url, secretKey } = supabaseAdminConfig();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: supabaseSecretHeaders(secretKey),
  });
  if (!response.ok && response.status !== 404) {
    throw new SupabaseRequestError("Não foi possível desfazer o acesso incompleto.", response.status);
  }
}

export async function signInWithPassword(email: string, password: string) {
  const { url, publishableKey } = supabasePublicConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    msg?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new SupabaseRequestError(payload.error_description || payload.msg || "E-mail ou senha inválidos.", response.status);
  }
  return payload;
}

export async function sendPasswordRecovery(email: string, redirectTo: string) {
  const { url, publishableKey } = supabasePublicConfig();
  const response = await fetch(`${url}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });
  if (!response.ok) throw new SupabaseRequestError("Não foi possível solicitar a recuperação.", response.status);
}

export async function sendMagicLink(email: string, redirectTo: string) {
  const { url, publishableKey } = supabasePublicConfig();
  const query = new URLSearchParams({ redirect_to: redirectTo });
  const response = await fetch(`${url}/auth/v1/otp?${query}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: false }),
  });
  if (!response.ok) throw new SupabaseRequestError("Não foi possível enviar o link de acesso.", response.status);
}

export async function resetPasswordWithRecoveryToken(accessToken: string, password: string) {
  const { url, publishableKey } = supabasePublicConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new SupabaseRequestError("O link de recuperação expirou ou já foi usado.", response.status);
}

export async function getAuthUser(accessToken: string) {
  const { url, publishableKey } = supabasePublicConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string }>;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
