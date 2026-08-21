import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { SNAPSHOTS_ENABLED } from "../playwright.config";

/** The reference week: Mon 29 June – Sun 5 July 2026. */
const REFERENCE_WEEK = "2026-06-29";
const JULY = "2026-07-01";
const REFERENCE_URL = `/?week=${REFERENCE_WEEK}&month=${JULY}`;

/** This week's Monday, from the *browser's* clock — the only one that counts. */
function thisMonday(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const pad = (value: number, width: number) => String(value).padStart(width, "0");
    return `${pad(monday.getFullYear(), 4)}-${pad(monday.getMonth() + 1, 2)}-${pad(monday.getDate(), 2)}`;
  });
}

async function addTaskTo(page: Page, dayLabel: string, title: string) {
  const field = page.getByLabel(`Add a task to ${dayLabel}`);
  await field.fill(title);
  await field.press("Enter");
  await expect(page.getByText(title)).toBeVisible();
  // Let the Server Action land before anything reloads out from under it.
  await expect
    .poll(() => page.getByText(title).count(), { timeout: 10_000 })
    .toBeGreaterThan(0);
}

test.describe("the planner", () => {
  test("lands on the current week with seven dated sections", async ({ page }) => {
    await page.goto("/");
    const monday = await thisMonday(page);
    await page.waitForURL((url) => url.searchParams.get("week") === monday);
    await expect(page.getByRole("region")).toHaveCount(7);
  });

  test("files a task under one day and no other, and it survives a reload", async ({ page }) => {
    await page.goto(REFERENCE_URL);
    await addTaskTo(page, "Wednesday 1 July", "ship the thing");

    const sections = await page.getByRole("region").all();
    const counts = await Promise.all(sections.map((s) => s.getByText("ship the thing").count()));
    expect(counts).toEqual([0, 0, 1, 0, 0, 0, 0]);

    // Real persistence, not a client cache.
    await page.reload();
    await expect(page.getByText("ship the thing")).toBeVisible();
  });

  test("keeps completion across a reload, and delete removes the task", async ({ page }) => {
    await page.goto(REFERENCE_URL);
    await addTaskTo(page, "Thursday 2 July", "water plants");

    const checkbox = page.getByRole("checkbox", { name: "water plants" });
    await checkbox.check();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "water plants" })).toBeChecked();

    await page.getByRole("button", { name: /delete .*water plants/i }).click();
    await page.reload();
    await expect(page.getByText("water plants")).toHaveCount(0);
  });

  test("prints Independence Day on the 4th after navigating to July 2026", async ({ page }) => {
    await page.goto(`/?week=${REFERENCE_WEEK}&month=2026-06-01`);
    await page.getByRole("link", { name: /next month/i }).click();
    // A predicate, not a glob: path globs do not match query strings.
    await page.waitForURL((url) => url.searchParams.get("month") === JULY);
    await expect(page.getByText("JUL 2026")).toBeVisible();

    const saturday = page.getByRole("region", { name: "Saturday 4 July" });
    await expect(saturday).toContainText(/independence day/i);
    // On its own date, not moved to the Friday it is federally observed.
    await expect(page.getByRole("region", { name: "Friday 3 July" })).not.toContainText(
      /independence day/i,
    );

    // Uppercase by CSS and never italic — a bitmap face either lacks an italic
    // entirely or fakes one by shearing the bitmap into mush.
    const label = saturday.getByText(/independence day/i);
    await expect(label).toHaveCSS("text-transform", "uppercase");
    await expect(label).toHaveCSS("font-style", "normal");
  });

  test("renders a deep-linked week directly", async ({ page }) => {
    await page.goto(`/?week=${REFERENCE_WEEK}`);
    const labels = await page.getByRole("region").evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("aria-label")),
    );
    expect(labels[0]).toBe("Monday 29 June");
    expect(labels[6]).toBe("Sunday 5 July");
  });

  test("offers a way back to the current week only when away from it", async ({ page }) => {
    const backToThisWeek = page.getByRole("link", { name: "This week" });

    // On the current week there is nowhere to go back to, so nothing is shown.
    await page.goto("/");
    await expect(page.getByRole("region").first()).toBeVisible();
    await expect(backToThisWeek).toBeHidden();

    await page.goto(REFERENCE_URL);
    await backToThisWeek.click();

    // Back on the browser's own week — the same week `/` lands on.
    const thisWeekMonday = await page.evaluate(() => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    });
    await page.waitForURL((url) => url.searchParams.get("week") === thisWeekMonday);
    await expect(backToThisWeek).toBeHidden();
  });

  test("normalizes a mid-week ?week= to the week that contains it", async ({ page }) => {
    // The param is user input and may name any day.
    await page.goto("/?week=2026-07-02");
    const labels = await page.getByRole("region").evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("aria-label")),
    );
    expect(labels[0]).toBe("Monday 29 June");
  });

  test("keeps the chosen slime across a reload", async ({ page }) => {
    await page.goto(REFERENCE_URL);
    const accent = () =>
      page.evaluate(() =>
        getComputedStyle(document.querySelector("main")!)
          .getPropertyValue("--color-accent")
          .trim(),
      );

    const before = await accent();
    // The swatch input is visually hidden; a user clicks the label, and so do we.
    await page.locator('label:has(input[value="bubblegum"])').click();
    await expect.poll(accent, { timeout: 10_000 }).not.toBe(before);
    const chosen = await accent();

    await page.reload();
    await expect(page.getByRole("radio", { name: "bubblegum" })).toBeChecked();
    expect(await accent()).toBe(chosen);

    // The visual snapshot pins the default, so put it back.
    await page.locator('label:has(input[value="teal"])').click();
    await expect.poll(accent, { timeout: 10_000 }).toBe(before);
  });

  test("tints the headings and day labels with the chosen slime", async ({ page }) => {
    await page.goto(REFERENCE_URL);

    // bubblegum's shade, the value the token is set to when it is picked.
    const bubblegum = "rgb(150, 41, 107)";
    await page.locator('label:has(input[value="bubblegum"])').click();

    const monday = page.getByRole("region", { name: "Monday 29 June" });
    for (const label of [
      page.getByRole("heading", { name: /JUN 29/ }),
      // The mini calendar's month heading, whichever month it opens on.
      page.locator("aside").getByText(/^[A-Z]{3} \d{4}$/),
      monday.getByText("MON"),
    ]) {
      await expect.poll(() => label.evaluate((node) => getComputedStyle(node).color), {
        timeout: 10_000,
      }).toBe(bubblegum);
    }

    // The date number is content, not a label, and stays ink.
    await expect(monday.getByText("29", { exact: true })).toHaveCSS("color", "rgb(23, 22, 19)");

    await page.locator('label:has(input[value="teal"])').click();
  });
});

test.describe("server/client time-zone skew", () => {
  /**
   * The genuinely new hazard on the web, and the reason the selected week is a
   * URL param rather than something the server computes. `TZ=… npx playwright
   * test` moves the server *and* the browser together, which is the easy case;
   * this moves only the browser, so the server is rendering in one zone while
   * the client hydrates in another — a real user in Kiritimati hitting a
   * server in California.
   */
  for (const timezoneId of ["Pacific/Kiritimati", "Pacific/Niue", "UTC"]) {
    test(`lands on the browser's week from ${timezoneId}`, async ({ browser }) => {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();

      await page.goto("/");
      const monday = await thisMonday(page);
      await page.waitForURL((url) => url.searchParams.get("week") === monday);
      await expect(page.getByRole("region")).toHaveCount(7);

      // And a task filed from that zone lands on the day the browser named.
      const label = await page.getByRole("region").first().getAttribute("aria-label");
      await addTaskTo(page, label!, `hello from ${timezoneId}`);
      await page.reload();
      await expect(
        page.getByRole("region", { name: label! }).getByText(`hello from ${timezoneId}`),
      ).toBeVisible();

      await context.close();
    });
  }
});

test.describe("the production build", () => {
  test("does not expose the dev-only specimen page", async ({ page }) => {
    // The specimen exists to review the theme in isolation; it is not part of
    // the app, and the E2E suite runs a real production build, so this is the
    // build it would leak from.
    const response = await page.goto("/specimen");
    expect(response?.status()).toBe(404);
  });

  test("applies both migrations in order to an empty database", async ({ page }) => {
    // The webServer throws its data directory away before every run, so
    // reaching a rendered week page at all means 0000_tasks and 0001_settings
    // both applied cleanly, in order, to nothing.
    await page.goto(REFERENCE_URL);
    await expect(page.getByRole("region")).toHaveCount(7);
    await expect(page.getByRole("radio", { name: "teal" })).toBeAttached();
  });
});

test.describe("theme guards", () => {
  /**
   * The six theme rules, asserted from computed styles on the real week page
   * rather than the specimen — this is the check that catches a stray
   * `rounded-md` or a blurred shadow arriving in a later change, and unlike a
   * pixel snapshot it cannot flap on a font-rendering difference.
   */
  for (const deviceScaleFactor of [1, 1.5, 2]) {
    test(`obeys the theme rules at DPR ${deviceScaleFactor}`, async ({ browser }) => {
      const context = await browser.newContext({ deviceScaleFactor });
      const page = await context.newPage();
      await page.goto(REFERENCE_URL);
      await page.evaluate(() => document.fonts.ready);

      const violations = await page.evaluate(() => {
        const round: string[] = [];
        const blurred: string[] = [];
        const offGrid: string[] = [];
        const thinBorder: string[] = [];

        for (const element of document.querySelectorAll("*")) {
          const style = getComputedStyle(element);
          const name = element.tagName.toLowerCase();

          for (const corner of [
            "borderTopLeftRadius",
            "borderTopRightRadius",
            "borderBottomLeftRadius",
            "borderBottomRightRadius",
          ] as const) {
            if (style[corner] !== "0px") round.push(`${name} ${corner}=${style[corner]}`);
          }

          if (style.boxShadow !== "none") {
            // "rgb(...) Xpx Ypx BLURpx [SPREADpx]" — the third length is blur.
            const lengths = style.boxShadow.match(/-?[\d.]+px/g) ?? [];
            if (lengths[2] && parseFloat(lengths[2]) !== 0) {
              blurred.push(`${name} ${style.boxShadow}`);
            }
          }
          if (style.filter !== "none") blurred.push(`${name} filter=${style.filter}`);

          for (const property of [
            "fontSize",
            "lineHeight",
            "paddingTop",
            "paddingLeft",
            "marginTop",
            "gap",
          ] as const) {
            const value = parseFloat(style[property]);
            // Chromium reports text-derived lengths in 1/64px, so anything
            // under 0.05px is a rasterizer quantum rather than a half-pixel.
            if (Number.isFinite(value) && Math.abs(value - Math.round(value)) > 0.05) {
              offGrid.push(`${name} ${property}=${style[property]}`);
            }
          }

          for (const side of ["borderTopWidth", "borderLeftWidth"] as const) {
            const width = parseFloat(style[side]);
            // A 1px border straddles a physical pixel boundary at 1.5x and
            // renders as two grey half-pixels.
            if (width > 0 && width < 2) thinBorder.push(`${name} ${side}=${style[side]}`);
          }
        }
        return {
          round: [...new Set(round)],
          blurred: [...new Set(blurred)],
          offGrid: [...new Set(offGrid)],
          thinBorder: [...new Set(thinBorder)],
        };
      });

      expect(violations.round, "nothing is round").toEqual([]);
      expect(violations.blurred, "nothing is blurred").toEqual([]);
      expect(violations.offGrid, "everything lands on the grid").toEqual([]);
      expect(violations.thinBorder, "borders are 2px, never 1px").toEqual([]);

      await context.close();
    });
  }

  test("draws the backdrop without letting it touch the page", async ({ browser }) => {
    // Scenery is only worth having if it cannot cost anything: no scrollbar,
    // no swallowed clicks, nothing for a screen reader to read out.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(REFERENCE_URL);

    const backdrop = page.locator("[aria-hidden='true']").filter({ has: page.locator("svg") }).first();
    await expect(backdrop).toBeAttached();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows, "the backdrop must be clipped, not scrolled to").toBe(false);

    // A click where the scenery is lands on the page, not on a cloud.
    await expect(page.locator("main")).toBeVisible();
    const onTop = await page.evaluate(() => {
      const element = document.elementFromPoint(20, 60);
      return element?.closest("[aria-hidden='true']") !== null;
    });
    expect(onTop, "the backdrop must not sit above the page").toBe(false);

    await context.close();
  });

  test("has no accessibility violations", async ({ page }) => {
    // Aimed at the two failure modes this theme invites: a mid-tone palette
    // that drops below 4.5:1, and a PixelCheckbox that lost its real <input>.
    await page.goto(REFERENCE_URL);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });

  test("works under reduced motion, with nothing animating", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(REFERENCE_URL);

    const animated = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .filter((element) => {
          const style = getComputedStyle(element);
          return style.transitionDuration !== "0s" || style.animationName !== "none";
        })
        .map((element) => element.tagName.toLowerCase()),
    );
    expect(animated).toEqual([]);

    // The press state is a position jump, not an animation, so it still works.
    const button = page.getByRole("link", { name: /next month/i });
    await expect(button).toBeVisible();
    await button.click();
    await page.waitForURL((url) => url.searchParams.get("month") === "2026-08-01");
  });

});

/**
 * Pixel snapshots, gated. A font-rendering difference between a developer's
 * machine and CI makes these flap, so they run only in the pinned Playwright
 * container image — see the comment in playwright.config.ts for the command.
 * Everything they are *for* is also asserted above, deterministically.
 */
test.describe("pixel snapshots", () => {
  test.skip(!SNAPSHOTS_ENABLED, "pixel snapshots run only in the pinned container image");

  for (const deviceScaleFactor of [1, 2]) {
    test(`looks unchanged at DPR ${deviceScaleFactor}`, async ({ browser }) => {
      const context = await browser.newContext({ deviceScaleFactor, viewport: { width: 1280, height: 1024 } });
      const page = await context.newPage();
      // The deep-linked week fixes the content, so the shot is deterministic.
      await page.goto(REFERENCE_URL);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`week-dpr-${deviceScaleFactor}.png`, { fullPage: true });
      await context.close();
    });
  }
});
