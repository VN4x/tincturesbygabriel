export function stripeCheckoutForm(input: {
  origin: string;
  email: string;
  priceId: string;
}): URLSearchParams {
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@")) throw new Error("missing_email");
  return new URLSearchParams({
    mode: "payment",
    success_url: `${input.origin}/read?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/#ligipaas`,
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    customer_email: email,
    "metadata[email]": email,
  });
}
