import { test, expect, Page, BrowserContext } from "@playwright/test";

// Full two-partner UI journey against the real running app:
// signup (keys generated in-browser) -> recovery code -> onboarding ->
// create/join -> E2EE chat -> encrypted message delivered + decrypted.

const uniq = () => Math.random().toString(36).slice(2, 10);

async function signupAndRecover(page: Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByPlaceholder("Full Name").fill(name);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: /Start Together/i }).click();

  // Recovery code screen (proves libsodium ran + identity was created in-browser).
  // First run is slow: cold libsodium WASM init + double Argon2id in the browser.
  await expect(page.getByText("Your Recovery Code")).toBeVisible({ timeout: 40000 });
  await page.getByRole("button", { name: /I've saved it/i }).click();

  // Lands on onboarding.
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20000 });
}

test("two partners exchange an end-to-end encrypted message", async ({ browser }) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const alice = await ctxA.newPage();
  const bob = await ctxB.newPage();

  const tag = uniq();
  const aliceEmail = `alice_${tag}@test.com`;
  const bobEmail = `bob_${tag}@test.com`;

  // --- Alice signs up and creates the space ---
  await signupAndRecover(alice, "Aurora", aliceEmail);
  await alice.getByRole("button", { name: /Start New Space/i }).click();
  // The invite code is rendered large on the "waiting" card.
  await expect(alice.getByText(/Waiting for them/i)).toBeVisible();
  const codeText = await alice.locator("span.font-serif.tracking-\\[0\\.2em\\]").first().innerText();
  const inviteCode = codeText.trim();
  expect(inviteCode.length).toBeGreaterThan(4);

  // --- Bob signs up and joins with the code ---
  await signupAndRecover(bob, "Blake", bobEmail);
  await bob.getByPlaceholder("PASTE PARTNER'S CODE").fill(inviteCode);
  await bob.getByRole("button", { name: /Join Partner/i }).click();
  await expect(bob).toHaveURL(/\/chat/, { timeout: 20000 });

  // --- Alice enters the chat (creator mints CK + auto-distributes to Bob) ---
  // No manual reloads: CryptoContext polling should converge both sides.
  await alice.goto("/chat");

  // --- Alice sends an encrypted whisper ---
  const secret = `our-secret-${tag}`;
  const aliceInput = alice.getByPlaceholder("Whisper something...");
  await expect(aliceInput).toBeVisible({ timeout: 20000 });
  await aliceInput.fill(secret);
  await aliceInput.press("Enter");

  // Alice sees her own message (optimistic plaintext).
  await expect(alice.getByText(secret)).toBeVisible({ timeout: 15000 });

  // --- Bob receives + decrypts it live ---
  await expect(bob.getByText(secret)).toBeVisible({ timeout: 20000 });

  await ctxA.close();
  await ctxB.close();
});
