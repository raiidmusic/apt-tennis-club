import { runtimeEnv, SupabaseRequestError } from "./supabase-server";

export function asaasConfig() {
  const currentEnv = runtimeEnv();
  const apiKey = currentEnv.ASAAS_API_KEY;
  const apiBaseUrl = (currentEnv.ASAAS_API_BASE_URL || "https://api.asaas.com/v3").replace(/\/$/, "");
  const checkoutBaseUrl = (currentEnv.ASAAS_CHECKOUT_BASE_URL || (apiBaseUrl.includes("sandbox") ? "https://sandbox.asaas.com" : "https://asaas.com")).replace(/\/$/, "");
  if (!apiKey) throw new SupabaseRequestError("A cobrança do APT ainda está sendo configurada.", 503);
  return { apiKey, apiBaseUrl, checkoutBaseUrl };
}

export async function asaasRequest(path: string, init: RequestInit = {}) {
  const { apiKey, apiBaseUrl } = asaasConfig();
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    signal: init.signal || AbortSignal.timeout(15_000),
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "APT-Tennis-Club/1.0",
      ...init.headers,
    },
  });
}

export function asaasCheckoutUrl(checkoutId: string) {
  return `${asaasConfig().checkoutBaseUrl}/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`;
}
