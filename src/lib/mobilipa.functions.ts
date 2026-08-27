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
  email: z.string().trim().email().max(160).optional(),
  phone: z.string().trim().regex(/^0[67]\d{8}$/),
  amount: z.number().int().positive().max(10000000),
});

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, message: "Payment not configured" };
    }

    const phone = toIntl(data.phone);

    try {
      const res = await fetch(`${BASE}/v1/payment/create_order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          buyer_name: data.name,
          buyer_email: data.email || `${phone}@dolaway.site`,
          buyer_phone: phone,
          amount: data.amount,
          currency: "TZS",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const payload = (json["data"] ?? json) as Record<string, unknown>;
      const apiStatus = String(json["status"] ?? "").toLowerCase();
      const orderId = String(payload["order_id"] ?? "");

      if (!res.ok || (apiStatus && apiStatus !== "success") || !orderId) {
        return {
          ok: false as const,
          message: String(json["message"] ?? "Malipo yameshindikana. Jaribu tena."),
        };
      }

      return {
        ok: true as const,
        orderId,
        reference: String(payload["reference"] ?? ""),
        status: String(payload["payment_status"] ?? payload["status"] ?? "PENDING").toUpperCase(),
        message: String(json["message"] ?? "Push ya malipo imetumwa kwenye simu yako."),
      };
    } catch {
      return { ok: false as const, message: "Imeshindikana kuwasiliana na Mobilipa. Jaribu tena." };
    }
  });

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) return { status: "PENDING" as const, transientError: true };

    try {
      // Mobilipa's order status endpoint accepts POST with the order_id.
      const res = await fetch(`${BASE}/v1/payment/order_status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({ order_id: data.orderId }),
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const tx = (json["data"] ?? json["transaction"] ?? {}) as Record<string, unknown>;
      const status = String(
        tx["payment_status"] ?? tx["status"] ?? json["payment_status"] ?? json["status"] ?? "PENDING",
      ).toUpperCase();

      return {
        status: status || "PENDING",
        transientError: !res.ok,
        message: json["message"] ? String(json["message"]) : undefined,
      };
    } catch {
      // Keep polling through temporary network errors.
      return { status: "PENDING" as const, transientError: true };
    }
  });
