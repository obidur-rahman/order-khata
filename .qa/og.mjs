import { chromium } from "playwright";

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Bengali:wght@400;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#0a0b0f;color:#f1efe6;
       font-family:Archivo,system-ui,sans-serif;overflow:hidden;position:relative}
  .rules{position:absolute;inset:0;
    background-image:repeating-linear-gradient(to bottom,rgba(241,239,230,.06) 0 1px,transparent 1px 30px)}
  .cols{position:absolute;inset:0;
    background-image:repeating-linear-gradient(to right,rgba(241,239,230,.05) 0 1px,transparent 1px 25%)}
  .wrap{position:relative;padding:44px 56px;height:100%;display:flex;flex-direction:column}
  .top{display:flex;justify-content:space-between;align-items:baseline;
       font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a3a6b4;
       border-bottom:1px solid #232736;padding-bottom:14px}
  h1{font-weight:700;font-stretch:118%;letter-spacing:-.042em;line-height:.9;
     font-size:86px;text-transform:uppercase;margin-top:46px}
  .mark{background:#e7e06b;color:#101208;padding:0 .1em;box-decoration-break:clone}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;
        border-top:1px solid #232736;padding-top:16px}
  .lede{max-width:520px;color:#a3a6b4;font-size:17px;line-height:1.6}
  .stamps{display:flex;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:11px;
          letter-spacing:.1em;text-transform:uppercase;color:#f1efe6}
  .stamp{border:1px solid #394054;padding:5px 8px;border-radius:2px;display:flex;gap:6px;align-items:center}
  .dot{width:6px;height:6px;display:inline-block}
</style></head><body>
<div class="rules"></div><div class="cols"></div>
<div class="wrap">
  <div class="top"><span>Order Khata</span><span>simulated Page inbox · 3 scripts · 6 classes</span></div>
  <h1>Sort the noise.<br><span class="mark">Keep the sale.</span></h1>
  <div class="foot">
    <p class="lede">Bangla, Banglish and English read in one pass. The clear ones handled, the risky ones kept for you.</p>
    <div class="stamps">
      <span class="stamp"><i class="dot" style="background:#79dda0"></i>Auto</span>
      <span class="stamp"><i class="dot" style="background:#e7e06b"></i>Review</span>
      <span class="stamp"><i class="dot" style="background:#ff8a7a"></i>Scam</span>
    </div>
  </div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: "E:/work/dokanbox/frontend/public/og.png" });
await browser.close();
console.log("og.png written");
