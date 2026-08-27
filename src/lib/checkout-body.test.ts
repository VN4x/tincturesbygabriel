import { describe, expect, it } from "vitest";
import { stripeCheckoutForm } from "./checkout-body";

describe("stripeCheckoutForm", () => {
  it("always sends customer_email and metadata[email] so webhook and success URL share an identity", () => {
    const body = stripeCheckoutForm({
      origin: "https://tincturesbygabriel.lovable.app",
      email: "Buyer@Example.com",
      priceId: "price_123",
    });
    expect(body.get("customer_email")).toBe("buyer@example.com");
    expect(body.get("metadata[email]")).toBe("buyer@example.com");
    expect(body.get("success_url")).toContain("/read?session_id={CHECKOUT_SESSION_ID}");
    expect(body.get("line_items[0][price]")).toBe("price_123");
  });

  it("refuses a checkout with no real email", () => {
    expect(() =>
      stripeCheckoutForm({ origin: "http://localhost:3000", email: "not-an-email", priceId: "price_1" }),
    ).toThrow("missing_email");
  });
});
