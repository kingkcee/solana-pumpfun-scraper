const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");  // headless browser

const app = express();
app.use(cors());

// Helper to scrape Pump.fun token page
async function scrapePumpFun(address) {
  const browser = await chromium.launch({
    args: chromium.args,
    headless: true,
    executablePath: await chromium.executablePath(),
  });
  const page = await browser.newPage();
  await page.goto(`https://pump.fun/token/${address}`, { waitUntil: "networkidle" });
  const html = await page.content();
  await browser.close();

  // Extract fields via regex
  const getMatch = (re) => {
    const m = html.match(re);
    return m && m[1] ? parseFloat(m[1]) : null;
  };
  const totalSolRaised    = getMatch(/Total SOL Raised:\s*([\d.]+)/);
  const buyCount          = getMatch(/Buy Count:\s*(\d+)/);
  const recentBuyVelocity = getMatch(/Buy Speed:\s*(\d+)/);
  const liquidityLocked   = html.includes("Liquidity is locked");
  const mintEnabled       = html.includes("Mint is enabled");
  const deployerBuying    = html.includes("Deployer is buying");

  return { address, totalSolRaised, buyCount, recentBuyVelocity,
           liquidityLocked, mintEnabled, deployerBuying };
}

app.get("/api/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    res.status(400).json({ success: false, error: "Missing address" });
    return;
  }
  try {
    const data = await scrapePumpFun(address);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: "Scrape failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Pump.fun scraper listening on port ${port}`);
});
