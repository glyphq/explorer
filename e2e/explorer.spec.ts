import { expect, test } from "@playwright/test";

test.describe("public explorer navigation", () => {
  test("opens primary catalogue routes", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Explore Qubic");
    await expect(page.getByRole("heading", { name: "Explore Qubic" })).toBeVisible();

    await page.getByRole("link", { name: "Tokens" }).click();
    await expect(page).toHaveURL(/\/tokens$/);
    await expect(page.getByRole("heading", { name: "Tokens" })).toBeVisible();

    await page.getByRole("link", { name: "Rich list" }).click();
    await expect(page).toHaveURL(/\/rich-list$/);
    await expect(page.getByRole("heading", { name: "Rich list" })).toBeVisible();
  });

  test("presents the full-width dither lookup hero", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator("section[aria-labelledby='overview-heading']");
    await expect(hero.getByRole("heading", { name: "Explore Qubic" })).toBeVisible();
    const lookup = hero.getByRole("button", { name: /Look up the network/ });
    await expect(lookup).toBeVisible();
    await expect(hero.locator("canvas")).toHaveCount(1);

    const geometry = await page.evaluate(() => {
      const heroElement = document.querySelector<HTMLElement>(".glyph-home-hero");
      if (!heroElement) return null;
      return {
        height: heroElement.getBoundingClientRect().height,
        top: heroElement.getBoundingClientRect().top,
        documentWidth: document.body.getBoundingClientRect().width,
        radius: getComputedStyle(heroElement).borderBottomLeftRadius,
        width: heroElement.getBoundingClientRect().width,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry?.width).toBe(geometry?.documentWidth);
    const viewport = page.viewportSize();
    expect(geometry?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) * 0.6);
    expect(geometry?.top).toBe(0);
    expect(geometry?.radius).not.toBe("0px");
  });

  test("renders safe feedback for invalid typed routes", async ({ page }) => {
    await page.goto("/transaction/not-a-transaction");

    await expect(page.getByRole("alert").getByText("Invalid transaction hash", { exact: true })).toBeVisible();
    await expect(page.getByText("canonical 60-character lowercase transaction hash format")).toBeVisible();
  });
});
