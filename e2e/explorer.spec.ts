import { expect, test } from "@playwright/test";

const MARKET_FIXTURE = {
  priceUsd: 4.4e-7,
  marketCapUsd: 62_000_000,
  priceChange24h: 1.2,
  priceChange7d: -0.8,
  volume24hUsd: 840_000,
  circulatingSupply: 142_000_000_000_000,
  lastUpdated: "2026-09-03T01:00:00.000Z",
  history: [
    { timestamp: 1_788_395_200_000, priceUsd: 4.1e-7 },
    { timestamp: 1_788_482_400_000, priceUsd: 4.4e-7 },
  ],
  marketCapHistory: [
    { timestamp: 1_788_395_200_000, value: 58_000_000 },
    { timestamp: 1_788_482_400_000, value: 62_000_000 },
  ],
  volumeHistory: [
    { timestamp: 1_788_395_200_000, value: 710_000 },
    { timestamp: 1_788_482_400_000, value: 840_000 },
  ],
};

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

  test("opens one shared command palette from the global shortcut", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");

    await expect(page.getByRole("dialog", { name: "Glyph Explorer navigation and lookup" })).toHaveCount(1);
  });

  test("keeps primary navigation and lookup usable on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const mobileNavigation = page.getByRole("navigation", { name: "Mobile primary" });
    await expect(mobileNavigation).toBeVisible();
    await mobileNavigation.getByRole("link", { name: "Tokens" }).click();
    await expect(page).toHaveURL(/\/tokens$/);
    await expect(page.getByRole("heading", { name: "Tokens" })).toBeVisible();

    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Glyph Explorer navigation and lookup" });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  });

  test("keeps market charts readable and keyboard-operable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/market", (route) => route.fulfill({ json: MARKET_FIXTURE }));
    await page.goto("/");

    const chart = page.getByRole("group", { name: /Qubic price over the last 30 days/ });
    await expect(chart).toBeVisible();
    const chartBox = await chart.boundingBox();
    expect(chartBox).not.toBeNull();
    expect((chartBox?.x ?? 0) + (chartBox?.width ?? 0)).toBeLessThanOrEqual(390);

    await chart.focus();
    await page.keyboard.press("End");
    await expect(chart.getByText("$0.000000440", { exact: true })).toBeVisible();
  });

  test("renders safe feedback for invalid typed routes", async ({ page }) => {
    await page.goto("/transaction/not-a-transaction");

    await expect(page.getByRole("heading", { level: 1, name: "Invalid transaction hash" })).toBeVisible();
    await expect(page.getByRole("alert").getByText("Invalid transaction hash", { exact: true })).toBeVisible();
    await expect(page.getByText("canonical 60-character lowercase transaction hash format")).toBeVisible();
  });
});
