const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to OpenEMR...');
  await page.goto('http://192.168.1.46:8084/interface/login/login.php?site=default');
  
  // Login
  console.log('Logging in...');
  await page.fill('input[name="authUser"]', 'admin');
  await page.fill('input[name="clearPass"]', 'pass');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Go directly to the config page
  console.log('Navigating to Config page...');
  await page.goto('http://192.168.1.46:8084/interface/super/edit_globals.php');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Click on Connectors tab
  console.log('Clicking Connectors...');
  await page.click('a:has-text("Connectors")');
  await page.waitForTimeout(2000);
  
  // Find the OAuth2 Password Grant dropdown
  console.log('Looking for OAuth2 Password Grant setting...');
  
  // Look for select element related to OAuth2 Password Grant
  const selects = page.locator('select');
  const count = await selects.count();
  console.log(`Found ${count} select elements`);
  
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const name = await select.getAttribute('name');
    const id = await select.getAttribute('id');
    if (name && (name.includes('oauth') || name.includes('password') || name.includes('grant'))) {
      console.log(`Found: name=${name}`);
      // Set it to enable password grant
      await select.selectOption('On (Not Recommended)');
      console.log(`Set ${name} to On`);
    }
  }
  
  // Alternative: find by label text
  const row = page.locator('tr:has-text("Enable OAuth2 Password Grant")');
  if (await row.count() > 0) {
    const selectInRow = row.locator('select').first();
    if (await selectInRow.count() > 0) {
      await selectInRow.selectOption({ label: 'On (Not Recommended)' });
      console.log('✓ Enabled OAuth2 Password Grant');
    }
  }
  
  // Screenshot before saving
  await page.screenshot({ path: '/tmp/before_save_oauth.png', fullPage: true });
  
  // Save
  console.log('Saving...');
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/tmp/password_grant_enabled.png', fullPage: true });
  console.log('Done!');
  
  await browser.close();
})();
