export default async function run(page, ui) {
  const out = {};
  await page.goto('http://localhost:4242/');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForSelector('#product-grid .product-card', { timeout: 30000 });
  out.cards = await page.locator('#product-grid .product-card').count();
  out.catTiles = await page.locator('#category-grid a').count();
  out.tabs = await page.locator('#filter-tabs .tab-btn').count();
  // Test a swatch click on first card
  await page.click('#product-grid .product-card >> nth=0 >> .swatch >> nth=1');
  out.swatchLabel = await page.locator('#product-grid .product-card >> nth=0 >> [data-variant-name]').innerText();
  // Tab filter
  await page.click('#filter-tabs [data-tab] >> nth=2');
  await page.waitForTimeout(300);
  out.filteredCards = await page.locator('#product-grid .product-card').count();
  // Mobile drawer
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#drawer-btn');
  await page.waitForTimeout(400);
  out.drawerVisible = await page.locator('#drawer-panel').isVisible();
  await page.screenshot({ path: 'shot-mobile-drawer.png' });
  await page.click('#drawer-close');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot-mobile-home.png', fullPage: false });
  // Desktop screenshots
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:4242/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'shot-desktop-hero.png' });
  await page.goto('http://localhost:4242/product.html?id=1', { waitUntil: 'networkidle' });
  await page.waitForSelector('#pdp-swatches');
  await page.click('#pdp-swatches .swatch >> nth=1');
  await page.screenshot({ path: 'shot-product.png' });
  await page.goto('http://localhost:4242/cart.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  out.cartEmpty = await page.locator('#cart-view').innerText();
  return out;
}
