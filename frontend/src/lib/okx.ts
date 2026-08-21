import crypto from "crypto";

const OKX_BASE_URL = "https://web3.okx.com";
const OKX_TIMEOUT_MS = 8_000;

export type OkxRequestParams = Record<string, string>;

export function getOkxCredentials() {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;

  if (!apiKey || !secretKey || !passphrase) {
    throw new Error("OKX_API_KEY, OKX_SECRET_KEY, and OKX_PASSPHRASE are required");
  }

  return { apiKey, secretKey, passphrase };
}

export async function okxGet(path: string, params: OkxRequestParams) {
  const { apiKey, secretKey, passphrase } = getOkxCredentials();
  const queryString = `?${new URLSearchParams(params).toString()}`;
  const timestamp = new Date().toISOString();
  const method = "GET";
  const prehash = `${timestamp}${method}${path}${queryString}`;
  const signature = crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");

  const response = await fetch(`${OKX_BASE_URL}${path}${queryString}`, {
    method,
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(OKX_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OKX request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.code !== "0" || !payload?.data) {
    throw new Error(payload?.msg || "OKX API did not return data");
  }

  return payload.data;
}
