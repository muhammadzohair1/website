export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:4242/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#product-grid .product-card', { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shot-hero2.png' });
  await page.evaluate(() => document.getElementById('products').scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'shot-products2.png' });
  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:4242/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shot-mobile2.png' });
  return 'ok';
}
