import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { signIn } from "./helpers";

function screenshotPath(name: string) {
  const dir = path.join(process.cwd(), "docs", "screenshots");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

test.skip(!process.env.README_SCREENSHOTS, "Only runs when generating README assets.");

test("capture landing page, workspace, and new conversation dialog", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Conversations that keep pace with your team." }),
  ).toBeVisible();
  await page.screenshot({ path: screenshotPath("landing-page.png"), fullPage: true });

  await signIn(page);
  await page.goto("/chat/c_design");
  await expect(page.getByTestId("conversation-c_design")).toBeVisible();
  await page.screenshot({ path: screenshotPath("chat-workspace.png") });

  await page.getByRole("button", { name: "New conversation" }).first().click();
  await expect(page.getByTestId("new-conversation-dialog")).toBeVisible();
  await page.getByRole("switch", { name: "Create a group" }).click();
  await page.getByLabel("Group name").fill("Realtime ChatApp launch");
  await page.getByLabel("Select Ada Lovelace").click();
  await page.getByLabel("Select Priya Menon").click();
  await page.screenshot({ path: screenshotPath("new-conversation.png") });
});
