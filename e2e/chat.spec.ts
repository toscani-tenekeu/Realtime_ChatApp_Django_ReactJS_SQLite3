import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.use({
  permissions: ["microphone", "camera"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

test("signed-in user can send a message in a seeded conversation", async ({ page }) => {
  await signIn(page);
  await page.goto("/chat/c_design", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("chat-page")).toBeVisible();
  await expect(page.getByTestId("message-input")).toBeVisible();

  const message = `Playwright smoke ${Date.now()}`;
  await page.getByTestId("message-input").fill(message);
  await page.getByTestId("send-message").click();

  await expect(page.getByText(message)).toBeVisible();
});

test("signed-in user can create a new group conversation", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: "New conversation" }).first().click();
  await expect(page.getByTestId("new-conversation-dialog")).toBeVisible();

  await page.getByRole("switch", { name: "Create a group" }).click();
  await page.getByLabel("Group name").fill("Playwright Sprint");
  await page.getByLabel("Select Ada Lovelace").click();
  await page.getByLabel("Select Linus Wren").click();
  await page.getByRole("button", { name: "Create group" }).click();

  await expect(page).toHaveURL(/\/chat\//);
  await expect(
    page.getByRole("button", { name: /Open conversation Playwright Sprint/ }),
  ).toBeVisible();
});

test("direct-message header exposes audio and video call controls", async ({ page }) => {
  await signIn(page);
  await page.goto("/chat/c_ada", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Start audio call" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start video call" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record voice message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start audio call" })).toHaveAttribute(
    "aria-label",
    "Start audio call",
  );
});

test("signed-in user can record and send a voice message", async ({ page }) => {
  await signIn(page);
  await page.goto("/chat/c_ada", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Record voice message" }).click();
  await expect(page.getByRole("status")).toContainText("Recording");
  await page.waitForTimeout(750);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.locator('[data-testid="composer"]')).toContainText("voice-message-", {
    timeout: 5_000,
  });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator('audio[aria-label^="voice-message-"]')).toBeVisible({
    timeout: 15_000,
  });
});
