import { expect, type Page } from "@playwright/test";

export const demoUsers = {
  you: { identifier: "admin@example.com", password: "user1234" },
  ada: { identifier: "ada@example.com", password: "user1234" },
  linus: { identifier: "linus@example.com", password: "user1234" },
} as const;

export async function signIn(
  page: Page,
  user: { identifier: string; password: string } = demoUsers.you,
) {
  await page.goto("/signin", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Email or username" }).fill(user.identifier);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("chat-page")).toBeVisible();
  await expect(page.getByTestId("conversations-sidebar")).toBeVisible();
}
