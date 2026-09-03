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

  test("renders safe feedback for invalid typed routes", async ({ page }) => {
    await page.goto("/transaction/not-a-transaction");

    await expect(page.getByRole("alert").getByText("Invalid transaction hash", { exact: true })).toBeVisible();
    await expect(page.getByText("canonical 60-character lowercase transaction hash format")).toBeVisible();
  });
});
