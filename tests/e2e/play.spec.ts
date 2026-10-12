import { expect, test, type Page } from "@playwright/test";
import { newState, step, type Settings } from "../../src/engine.ts";
import { plural } from "../../src/format.ts";
import { mulberry32, parseSeed } from "../../src/rng.ts";

const setSpeed = (page: Page, value: number) =>
  page.locator("#speed").evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);

const roundsUntilBust = (settings: Settings, seed: string): number => {
  const state = newState(settings);
  const rng = mulberry32(parseSeed(seed)!);
  while (step(state, settings, rng));
  return state.rounds;
};

test("loads with the defaults and a seed in the URL", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("petersburg");
  await expect(page).toHaveURL(/\?b=100&p=10&u=coins&z=credit&s=[0-9a-z]{1,7}$/);
  await expect(page.locator("#f-rounds")).toHaveText("0");
  await expect(page.locator("#f-bankroll")).toHaveText("100");
  await expect(page.locator("#speed-label")).toHaveText("100 rounds/s");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(page.getByRole("link", { name: "the paradox" })).toBeVisible();
});

test("plays, locks the knobs, pauses and holds", async ({ page }, info) => {
  await page.goto("./?b=100&p=10&u=coins&z=credit&s=k3");
  await setSpeed(page, 6);
  const play = page.locator("#play");
  await play.click();
  await expect(play).toHaveText("Pause");
  await expect(page.locator("#bankroll")).toBeDisabled();
  await expect(page.locator("#zero button").first()).toBeDisabled();
  await expect(page.locator("#f-rounds")).not.toHaveText("0");
  await page.waitForTimeout(400);
  await play.click();
  await expect(play).toHaveText("Play");
  const rounds = await page.locator("#f-rounds").textContent();
  await page.waitForTimeout(200);
  expect(await page.locator("#f-rounds").textContent()).toBe(rounds);
  expect(Number(rounds!.replaceAll(",", ""))).toBeGreaterThan(1000);
  await expect(page.locator("#seq")).toHaveText(/^(H )*T$/);
  await expect(page.locator("#outcome")).toHaveText(/^paid 10, won \d/);
  await expect(page.locator("#bankroll")).toBeDisabled();
  await page.screenshot({ path: `test-results/paused-${info.project.name}.png`, fullPage: true });
});

test("busts under the stop rule at the round the seed dictates", async ({ page }, info) => {
  const settings: Settings = { bankroll: 100, price: 10, unit: "coins", zero: "stop" };
  const expected = roundsUntilBust(settings, "7");
  await page.goto("./?b=100&p=10&u=coins&z=stop&s=7");
  await setSpeed(page, 6);
  await page.locator("#play").click();
  await expect(page.locator("#bust")).toHaveText(`Broke after ${plural(expected, "round")}.`);
  await expect(page.locator("#flips")).toBeHidden();
  await expect(page.locator("#play")).toHaveText("Reset");
  await expect(page.locator("#reset")).toBeHidden();
  await page.screenshot({ path: `test-results/bust-${info.project.name}.png`, fullPage: true });
  await page.locator("#play").click();
  await expect(page).not.toHaveURL(/s=7$/);
  await expect(page.locator("#f-rounds")).toHaveText("0");
  await expect(page.locator("#f-bankroll")).toHaveText("100");
  await expect(page.locator("#bankroll")).toBeEnabled();
  await expect(page.locator("#play")).toHaveText("Play");
});

test("knobs write the URL and reset rolls a new seed", async ({ page }) => {
  await page.goto("./?b=100&p=10&u=coins&z=credit&s=abc");
  await page.locator("#bankroll").fill("250");
  await page.locator("#bankroll").blur();
  await expect(page).toHaveURL(/b=250&p=10&u=coins&z=credit&s=abc$/);
  await expect(page.locator("#f-bankroll")).toHaveText("250");
  await page.locator("#unit button[data-value=pct]").click();
  await page.locator("#price").fill("500");
  await page.locator("#price").blur();
  await expect(page).toHaveURL(/p=10&u=pct/);
  await page.locator("#price").fill("25");
  await page.locator("#price").blur();
  await expect(page).toHaveURL(/p=25&u=pct/);
  await page.locator("#zero button[data-value=stop]").click();
  await expect(page).toHaveURL(/z=stop&s=abc$/);
  await page.locator("#reset").click();
  await expect(page).toHaveURL(/b=250&p=25&u=pct&z=stop&s=(?!abc$)[0-9a-z]+$/);
});

test("space toggles play when nothing is focused", async ({ page }) => {
  await page.goto("./?b=100&p=10&u=coins&z=credit&s=zz");
  await page.locator("body").press(" ");
  await expect(page.locator("#play")).toHaveText("Pause");
  await page.locator("body").press(" ");
  await expect(page.locator("#play")).toHaveText("Play");
});

test("watch speed shows flips one at a time", async ({ page }) => {
  await page.goto("./?b=100&p=10&u=coins&z=credit&s=w1");
  await setSpeed(page, 1);
  await expect(page.locator("#speed-label")).toHaveText("4 flips/s");
  await page.locator("#play").click();
  await expect(page.locator("#seq")).toHaveText(/^[HT]( [HT])*$/);
  await expect(page.locator("#f-rounds")).not.toHaveText("0", { timeout: 5000 });
});
