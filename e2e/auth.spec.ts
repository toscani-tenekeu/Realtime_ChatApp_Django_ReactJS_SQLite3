import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("demo user can sign in and stay authenticated after reload", async ({ page }) => {
  await signIn(page);
  await expect(page.getByTestId("conversation-c_design")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("chat-page")).toBeVisible();
  await expect(page.getByTestId("conversation-c_design")).toBeVisible();
});
