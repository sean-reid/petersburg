import { expect, test } from "@playwright/test";

test("serves the page with the wordmark", async ({ page }, info) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("petersburg");
  await expect(page.getByRole("link", { name: "source" })).toBeVisible();
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png`, fullPage: true });
});
