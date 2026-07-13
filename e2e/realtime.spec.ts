import { expect, test } from "@playwright/test";
import { demoUsers, signIn } from "./helpers";

test("new message appears in real time for another signed-in user", async ({ browser }) => {
  const youContext = await browser.newContext();
  const adaContext = await browser.newContext();
  const youPage = await youContext.newPage();
  const adaPage = await adaContext.newPage();

  try {
    await signIn(youPage, demoUsers.you);
    await signIn(adaPage, demoUsers.ada);

    await youPage.goto("/chat/c_ada");
    await adaPage.goto("/chat/c_ada");

    const message = `Realtime check ${Date.now()}`;
    await adaPage.getByTestId("message-input").fill(message);
    await adaPage.getByTestId("send-message").click();

    await expect(youPage.getByText(message)).toBeVisible({ timeout: 15_000 });
  } finally {
    await youContext.close();
    await adaContext.close();
  }
});
