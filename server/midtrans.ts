import crypto from "crypto";

// ─── Midtrans QRIS integration ────────────────────────────────────────────────
// Docs: https://docs.midtrans.com/reference/charge-api-qris
//
// Env vars needed (Railway → Variables):
//   MIDTRANS_SERVER_KEY     = SB-Mid-server-xxx (sandbox) or Mid-server-xxx (production)
//   MIDTRANS_IS_PRODUCTION  = "false" (default) or "true"
//
// Jika env vars TIDAK di-set, sistem otomatis fallback ke static QRIS + unique amount.
// Tidak ada error atau crash — sistem tetap berjalan normal.

function apiBase(): string {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function authHeader(): string {
  const key = process.env.MIDTRANS_SERVER_KEY!;
  // Midtrans: Basic auth dengan server_key + ":" (password kosong)
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export function isMidtransEnabled(): boolean {
  return !!process.env.MIDTRANS_SERVER_KEY;
}

// ─── Charge QRIS ─────────────────────────────────────────────────────────────
export interface MidtransQrisResult {
  transactionId: string;  // UUID dari Midtrans, digunakan untuk fetch QR image
  expiryTime: string;     // "YYYY-MM-DD HH:mm:ss" — QR kadaluwarsa setelah ini
}

export async function chargeQris(
  orderId: string,
  grossAmount: number,
): Promise<MidtransQrisResult> {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY not set");
  }

  const resp = await fetch(`${apiBase()}/v2/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader(),
      "Accept": "application/json",
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      qris: {
        acquirer: "gopay",  // Routing melalui GoPay QRIS
      },
    }),
  });

  const data = await resp.json() as Record<string, any>;

  // status_code "201" = created successfully
  if (data.status_code !== "201") {
    throw new Error(`Midtrans ${data.status_code}: ${data.status_message}`);
  }

  return {
    transactionId: data.transaction_id as string,
    expiryTime: (data.expiry_time ?? "") as string,
  };
}

// ─── Fetch QR image buffer (untuk proxy endpoint) ─────────────────────────────
// Midtrans memerlukan auth untuk fetch QR image — tidak bisa langsung dari browser.
// Backend fetch → pipe ke client sebagai image/png.
export async function fetchQrisImageBuffer(
  transactionId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY not set");
  }

  const resp = await fetch(
    `${apiBase()}/v2/qris/${transactionId}/qr-code`,
    { headers: { "Authorization": authHeader() } },
  );

  if (!resp.ok) {
    throw new Error(`QR image fetch failed: ${resp.status} ${resp.statusText}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  const contentType = resp.headers.get("content-type") ?? "image/png";
  return { buffer, contentType };
}

// ─── Verify Midtrans webhook signature ────────────────────────────────────────
// Midtrans mengirim SHA-512(order_id + status_code + gross_amount + server_key)
export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  if (!process.env.MIDTRANS_SERVER_KEY) return false;
  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");
  return expected === signatureKey;
}
