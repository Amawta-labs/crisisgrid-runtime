import { mkdir, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const root = process.cwd();
const outputDir = resolve(root, "artifacts");
const rawDir = resolve(outputDir, "raw-video");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const webmOutput = resolve(outputDir, `crisisgrid-demo-${timestamp}.webm`);
const mp4Output = resolve(outputDir, `crisisgrid-demo-${timestamp}.mp4`);
const demoUrl = process.env.DEMO_URL ?? "http://localhost:3020/";

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function clickIfVisible(page, locator, options = {}) {
  if (await locator.isVisible().catch(() => false)) {
    await locator.click({ timeout: 2500, ...options }).catch(async () => {
      await locator.dispatchEvent("click");
    });
    return true;
  }

  return false;
}

async function chooseScenario(page, name, waitMs = 6800) {
  await page.getByRole("button", { name }).dispatchEvent("click");
  await wait(waitMs);
}

async function main() {
  await mkdir(rawDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: rawDir,
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();

  await page.goto(demoUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});

  // Opening: passive launch screen, then Vitacura earthquake runtime.
  await wait(22200);

  // Clear X overlay so the operational UI is visible before moving scenarios.
  await clickIfVisible(
    page,
    page.getByLabel("Aprobacion de publicacion en X").getByRole("button", { name: "No autorizar" }),
    { force: true },
  );
  await wait(1600);

  // Show coastal watch and wildfire: two different physical surfaces.
  await chooseScenario(page, "SHOA Valparaiso coast", 7200);
  await chooseScenario(page, "Valparaiso wildfire", 7600);

  // Approve/stop a generated emergency-service mock gate if it is visible.
  await clickIfVisible(page, page.getByRole("button", { name: "No autorizar" }).first(), { force: true });
  await wait(1200);

  // Show volcano and mudflow surfaces.
  await chooseScenario(page, "Villarrica volcano", 7600);
  await chooseScenario(page, "Cajon del Maipo aluvion", 7600);

  // Confirm the basin gate if visible.
  await clickIfVisible(page, page.getByRole("button", { name: "Approve watch" }), { force: true });
  await wait(1600);

  // End with blackout and autonomous X approval flow.
  await chooseScenario(page, "Santiago blackout", 7600);
  await clickIfVisible(
    page,
    page.getByLabel("Aprobacion de publicacion en X").getByRole("button", { name: "Autorizar" }),
    { force: true },
  );
  await wait(4200);

  await page.close();
  await context.close();
  await browser.close();

  const rawVideos = (await readdir(rawDir))
    .filter((file) => file.endsWith(".webm"))
    .map((file) => join(rawDir, file))
    .sort();

  const rawVideo = rawVideos.at(-1);
  if (!rawVideo || !existsSync(rawVideo)) {
    throw new Error("Playwright did not produce a video file.");
  }

  await rename(rawVideo, webmOutput);

  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      webmOutput,
      "-vf",
      "fps=30,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-movflags",
      "+faststart",
      mp4Output,
    ],
    { stdio: "inherit" },
  );

  if (ffmpeg.status !== 0) {
    console.log(JSON.stringify({ webm: webmOutput, mp4: null }, null, 2));
    process.exit(ffmpeg.status ?? 1);
  }

  console.log(JSON.stringify({ webm: webmOutput, mp4: mp4Output }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
