import { test, expect } from "@playwright/test";

test("a player can create a world, start an organization, advance a day and reload a save", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "建立你的江湖世界" })).toBeVisible();
  await page.locator("#seed").fill("20261122");
  await page.getByRole("button", { name: /生成新世界/ }).click();
  await expect(page.getByText("虛擬台灣・22 縣市")).toBeVisible();

  let chosen = false;
  const counties = page.locator(".county-tile");
  for (let countyIndex = 0; countyIndex < await counties.count() && !chosen; countyIndex++) {
    await counties.nth(countyIndex).click();
    const rows = page.locator(".district-row");
    for (let i = 0; i < await rows.count(); i++) {
      const row = rows.nth(i);
      const label = await row.innerText();
      if (label.includes("無主地盤") || label.includes("中立地方網絡")) {
        await row.click();
        chosen = true;
        break;
      }
    }
  }
  expect(chosen).toBeTruthy();
  await page.getByLabel("組織名稱").fill("雨城共好會");
  await page.getByLabel("領導人姓名").fill("林奕辰");
  await page.getByRole("button", { name: "選擇此地盤並開始遊戲" }).click();
  await expect(page.locator(".player-banner")).toContainText("雨城共好會");

  await page.getByRole("button", { name: /結束今天/ }).click();
  await expect(page.locator(".world-heading")).toContainText("第 2 天");
  await page.locator(".save-slot-actions").getByRole("button", { name: "儲存至 01" }).click();
  await expect(page.locator(".world-message")).toContainText("已儲存至存檔 01");

  await page.reload();
  const manualSave = page.locator(".save-row").filter({ hasText: "存檔 01" });
  await expect(manualSave).toBeVisible();
  await manualSave.getByRole("button", { name: "讀取" }).click();
  await expect(page.locator(".player-banner")).toContainText("雨城共好會");
  await expect(page.locator(".world-heading")).toContainText("第 2 天");
});
