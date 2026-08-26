import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://api.mobilipa.store";

const toIntl = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return digits;
};

const orderSchema = z.object({
  name: z.string().trim().min(3).max(60),
  phone: z.string().trim().regex(/^0[67]\d{8}$/),
  amount: z.number().int().positive().max(10000000),
});

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) return { ok: false as const, message: "Payment not configured" };

    const phone = toIntl(data.phone);
    const res = await fetch(`${BASE}/v1/payment/create_order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({
        buyer_name: data.name,
        buyer_email: `${phone}@dolaway.site`,
        buyer_phone: phone,
        amount: data.amount,
        currency: "TZS",
      }),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false as const, message: String(json["message"] ?? "Malipo yameshindikana") };
    }
    const payload = (json["data"] ?? json) as Record<string, unknown>;
    return {
      ok: true as const,
      orderId: String(payload["order_id"] ?? ""),
      reference: String(payload["reference"] ?? ""),
      status: String(payload["payment_status"] ?? payload["status"] ?? "PENDING"),
      message: String(json["message"] ?? "Push imetumwa"),
    };
  });

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderId: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) return { status: "FAILED" as const };

    const res = await fetch(`${BASE}/v1/payment/status?order_id=${encodeURIComponent(data.orderId)}`, {
      headers: { "X-API-KEY": apiKey },
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, any>;
    const tx = json?.data ?? json?.transaction ?? {};
    const status = String(tx.payment_status ?? tx.status ?? json?.status ?? "PENDING").toUpperCase();
    return { status };
  });
