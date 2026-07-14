import { expect, test } from "@playwright/test";
import { demoUsers, signIn } from "./helpers";

test.use({
  permissions: ["microphone", "camera"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

test("a direct audio call alerts the other signed-in user", async ({ browser }) => {
  const callerContext = await browser.newContext({ permissions: ["microphone"] });
  const receiverContext = await browser.newContext({ permissions: ["microphone"] });
  const caller = await callerContext.newPage();
  const receiver = await receiverContext.newPage();
  try {
    await signIn(caller, demoUsers.you);
    await signIn(receiver, demoUsers.ada);
    await caller.goto("/chat/c_ada");
    await receiver.goto("/chat/c_ada");
    await receiver.getByRole("button", { name: "Start audio call" }).waitFor();
    await caller.waitForTimeout(1_000);

    await caller.getByRole("button", { name: "Start audio call" }).click();
    await expect(receiver.getByRole("dialog", { name: "Incoming call" })).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    await callerContext.close();
    await receiverContext.close();
  }
});

test("a direct video call alerts the other signed-in user", async ({ browser }) => {
  const callerContext = await browser.newContext({ permissions: ["microphone", "camera"] });
  const receiverContext = await browser.newContext({ permissions: ["microphone", "camera"] });
  const caller = await callerContext.newPage();
  const receiver = await receiverContext.newPage();

  try {
    await signIn(caller, demoUsers.you);
    await signIn(receiver, demoUsers.ada);
    await caller.goto("/chat/c_ada");
    await receiver.goto("/chat/c_ada");
    await receiver.getByRole("button", { name: "Start video call" }).waitFor();
    await caller.getByRole("button", { name: "Start video call" }).click();
    await expect(receiver.getByRole("dialog", { name: "Incoming call" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(receiver.getByText("Incoming video call")).toBeVisible();
  } finally {
    await callerContext.close();
    await receiverContext.close();
  }
});
