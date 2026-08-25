import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { stripeSignatureHeader } from "../../src/lib/stripe-signature";

test.beforeAll(() => {
  execFileSync("python3", ["scripts/make-test-epub.py", "/tmp/mv-e2e-book.epub"], { stdio: "inherit" });
});

async function postPaidWebhook(request: { post: (url: string, opts: object) => Promise<{ ok: () => boolean; text: () => Promise<string>; json: () => Promise<unknown> }> }, email: string) {
  const raw = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_e2e_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        payment_status: "paid",
        amount_total: 500,
        customer_details: { email },
        customer_email: email,
        metadata: { email },
      },
    },
  });
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers["stripe-signature"] = await stripeSignatureHeader(raw, secret);
  const res = await request.post("/api/stripe/webhook", { data: raw, headers });
  const text = await res.text();
  expect(res.ok(), text).toBeTruthy();
  const body = JSON.parse(text) as { received?: boolean; email?: string };
  expect(body.email).toBe(email.toLowerCase());
}

async function openLogin(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("nav-login")).toBeVisible();
  await expect(async () => {
    await page.getByTestId("nav-login").click();
    await expect(page.getByTestId("access-email")).toBeVisible();
  }).toPass({ timeout: 20_000 });
}

test("webhook-only payment still lets a new browser OTP into /read", async ({ page, request, context }) => {
  const email = `e2e.${Date.now()}@example.com`;
  await context.clearCookies();
  await postPaidWebhook(request, email);
  await openLogin(page);
  await page.getByTestId("access-email").fill(email);
  await page.getByTestId("access-submit").click();
  await expect(page.getByTestId("access-otp")).toBeVisible({ timeout: 20_000 });
  const otpInput = page.locator('[data-testid="access-otp"] input').first();
  await otpInput.click();
  await otpInput.fill("123456");
  await page.getByTestId("access-submit").click();
  await expect(page).toHaveURL(/\/read/, { timeout: 20_000 });
});

test("unknown email cannot OTP (no ledger row)", async ({ page, context }) => {
  await context.clearCookies();
  await openLogin(page);
  await page.getByTestId("access-email").fill("nobody-yet@example.com");
  await page.getByTestId("access-submit").click();
  await expect(page.getByText(/kontot ei ole|no account/i)).toBeVisible({ timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/read/);
});
