const VPS_BASE = "/vps-api";

function getApiKey(): string {
  return import.meta.env.VITE_VPS_API_KEY ?? "";
}

function vpsHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = getApiKey();
  return {
    ...(key ? { "X-VPS-API-Key": key } : {}),
    ...extra,
  };
}

export async function vpsGet(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${VPS_BASE}${path}`, {
    ...init,
    headers: {
      ...vpsHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

export async function vpsPost(
  path: string,
  body: unknown,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${VPS_BASE}${path}`, {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...vpsHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(body),
  });
}
