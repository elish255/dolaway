import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://api.mobilipa.store";
export const PAYMENT_AMOUNT = 14500;
export const PAYMENT_CURRENCY = "TZS";

const toIntl = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return digits;
};

const orderSchema = z.object({
  name: z.string().trim().min(3).max(60),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().regex(/^0[67]\d{8}$/),
});

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) throw new Error("Payment not configured");

    const phone = toIntl(data.phone);
    const res = await fetch(`${BASE}/v1/payment/create_order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({
        buyer_name: data.name,
        buyer_email: data.email,
        buyer_phone: phone,
        amount: PAYMENT_AMOUNT,
        currency: PAYMENT_CURRENCY,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || String(json["status"] ?? "").toLowerCase() !== "success") {
      throw new Error(String(json["message"] ?? "Malipo yameshindikana"));
    }

    const payload = (json["data"] ?? json) as Record<string, unknown>;
    const orderId = String(payload["order_id"] ?? "");
    if (!orderId) throw new Error("Order ID haijarudi kutoka Mobilipa.");

    return {
      order_id: orderId,
      reference: String(payload["reference"] ?? ""),
      status: String(payload["payment_status"] ?? payload["status"] ?? "PENDING").toUpperCase(),
      message: String(json["message"] ?? "Push USSD imetumwa kwenye simu yako."),
    };
  });

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderId: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) throw new Error("Payment not configured");

    const res = await fetch(`${BASE}/v1/payment/order_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ order_id: data.orderId }),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(String(json["message"] ?? "Imeshindikana kuangalia status ya malipo."));

    const tx = (json["data"] ?? json["transaction"] ?? {}) as Record<string, unknown>;
    const status = String(tx["payment_status"] ?? tx["status"] ?? json["payment_status"] ?? json["status"] ?? "PENDING").toUpperCase();
    const transid = tx["transid"] ? String(tx["transid"]) : null;
    return { payment_status: status, transid, message: json["message"] ? String(json["message"]) : null };
  });
