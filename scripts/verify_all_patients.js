const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Logging into OpenEMR...');
  await page.goto('http://192.168.1.46:8084/interface/login/login.php?site=default');
  await page.fill('input[name="authUser"]', 'admin');
  await page.fill('input[name="clearPass"]', 'pass');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Go to Patient Finder
  await page.goto('http://192.168.1.46:8084/interface/main/finder/dynamic_finder.php');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const searchBox = page.locator('input[type="search"]').first();
  
  // Search for each patient
  const patients = ['Smith', 'Johnson', 'Williams'];
  const results = [];
  
  for (const name of patients) {
    await searchBox.fill('');
    await page.waitForTimeout(300);
    await searchBox.fill(name);
    await page.waitForTimeout(1500);
    
    // Check if found
    const entryText = await page.locator('.dataTables_info').textContent().catch(() => '');
    const hasData = !entryText.includes('0 to 0 of 0') && !entryText.includes('Showing 0');
    const foundText = await page.locator(`td:has-text("${name}")`).first().textContent().catch(() => null);
    
    if (foundText) {
      console.log(`✓ Found: ${foundText}`);
      results.push({ name, found: true, text: foundText });
    } else {
      console.log(`✗ Not found: ${name}`);
      results.push({ name, found: false });
    }
  }
  
  // Final screenshot with blank search showing all
  await searchBox.fill('');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/all_patients.png', fullPage: true });
  
  // Summary
  const found = results.filter(r => r.found).length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Found ${found} of ${patients.length} patients in OpenEMR`);
  
  await browser.close();
})();
