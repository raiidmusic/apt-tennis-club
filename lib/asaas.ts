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

type AsaasCustomer = {
  id?: string;
  cpfCnpj?: string;
  externalReference?: string;
};

type AsaasCollection<T> = { data?: T[] };

export async function ensureAsaasCustomer(input: {
  memberId: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  customerId?: string | null;
}) {
  if (input.customerId) {
    const response = await asaasRequest(`/customers/${encodeURIComponent(input.customerId)}`);
    if (response.ok) {
      const customer = await response.json() as AsaasCustomer;
      if (customer.id && (!customer.externalReference || customer.externalReference === input.memberId)) return customer.id;
      throw new SupabaseRequestError("O cliente financeiro já pertence a outro cadastro.", 409);
    }
    if (response.status !== 404) throw new SupabaseRequestError("O Asaas não respondeu à validação do cliente.", 502);
  }

  const query = new URLSearchParams({ externalReference: input.memberId, cpfCnpj: input.cpf, limit: "10" });
  const searchResponse = await asaasRequest(`/customers?${query}`);
  if (!searchResponse.ok) throw new SupabaseRequestError("O Asaas não respondeu à busca do cliente.", 502);
  const matches = ((await searchResponse.json() as AsaasCollection<AsaasCustomer>).data || [])
    .filter((customer) => customer.id && customer.externalReference === input.memberId && (customer.cpfCnpj || "").replace(/\D/g, "") === input.cpf);
  if (matches.length > 1) throw new SupabaseRequestError("Há mais de um cliente financeiro para este cadastro. A gestão precisa conciliar antes de continuar.", 409);
  if (matches[0]?.id) return matches[0].id;

  const createResponse = await asaasRequest("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpf,
      email: input.email,
      mobilePhone: input.phone,
      externalReference: input.memberId,
      notificationDisabled: true,
    }),
  });
  const created = await createResponse.json() as AsaasCustomer & { errors?: Array<{ description?: string }> };
  if (!createResponse.ok || !created.id) {
    throw new SupabaseRequestError(created.errors?.[0]?.description || "O Asaas recusou a criação do cliente Pix.", createResponse.status >= 400 && createResponse.status < 500 ? 502 : 409);
  }
  return created.id;
}
