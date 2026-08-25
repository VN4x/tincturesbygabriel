import { createFileRoute } from "@tanstack/react-router";
import { applyPaidCheckoutSession } from "@/lib/purchase-fulfillment";
import { verifyStripeSignature } from "@/lib/stripe-signature";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (secret) {
          const ok = await verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret);
          if (!ok) return new Response("invalid signature", { status: 400 });
        } else if (process.env["NODE_ENV"] === "production") {
          return new Response("webhook secret missing", { status: 500 });
        }

        let event: { type?: string; data?: { object?: Record<string, unknown> } };
        try {
          event = JSON.parse(raw) as typeof event;
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const obj = (event.data?.object ?? {}) as {
            id?: string;
            payment_status?: string;
            customer_email?: string;
            amount_total?: number;
            metadata?: Record<string, string>;
          };
          const result = await applyPaidCheckoutSession(obj);
          if (!result.ok) {
            return Response.json({ received: true, skipped: result.error });
          }
          return Response.json({ received: true, email: result.email });
        }

        return Response.json({ received: true });
      },
    },
  },
});
