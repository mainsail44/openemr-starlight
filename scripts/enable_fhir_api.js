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
  
  // Go directly to the super globals/config page
  console.log('Navigating directly to Config page...');
  await page.goto('http://192.168.1.46:8084/interface/super/edit_globals.php');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Screenshot current state
  await page.screenshot({ path: '/tmp/config_page.png' });
  console.log('Config page screenshot saved');
  
  // Click on Connectors tab in the left sidebar
  console.log('Looking for Connectors...');
  const connectorsLink = page.locator('a:has-text("Connectors"), div:has-text("Connectors")').first();
  if (await connectorsLink.count() > 0) {
    await connectorsLink.click();
    await page.waitForTimeout(2000);
    console.log('Clicked Connectors');
  }
  
  // Screenshot after clicking connectors
  await page.screenshot({ path: '/tmp/connectors_clicked.png', fullPage: true });
  
  // Find the FHIR REST API checkbox by looking for its label
  console.log('Looking for FHIR checkbox...');
  
  // Try to find checkbox by the text next to it
  const fhirRow = page.locator('tr:has-text("Enable OpenEMR Standard FHIR REST API") input[type="checkbox"]').first();
  if (await fhirRow.count() > 0) {
    const isChecked = await fhirRow.isChecked();
    console.log('FHIR checkbox found, checked:', isChecked);
    if (!isChecked) {
      await fhirRow.check();
      console.log('✓ Enabled FHIR REST API');
    }
  } else {
    // Alternative: look for any checkbox with "fhir" in its name
    const fhirInputs = page.locator('input[type="checkbox"]');
    const count = await fhirInputs.count();
    console.log(`Found ${count} checkboxes, looking for FHIR ones...`);
    
    // Get all input names containing 'fhir' or 'rest'
    for (let i = 0; i < Math.min(count, 50); i++) {
      const input = fhirInputs.nth(i);
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      if (name && (name.includes('fhir') || name.includes('rest'))) {
        console.log(`Found: name=${name}, id=${id}`);
        const isChecked = await input.isChecked();
        if (!isChecked && name.includes('fhir')) {
          await input.check();
          console.log(`✓ Checked ${name}`);
        }
      }
    }
  }
  
  // Also try to enable System Scopes
  const scopesRow = page.locator('tr:has-text("Enable OpenEMR FHIR System Scopes") input[type="checkbox"]').first();
  if (await scopesRow.count() > 0) {
    const isChecked = await scopesRow.isChecked();
    if (!isChecked) {
      await scopesRow.check();
      console.log('✓ Enabled FHIR System Scopes');
    }
  }
  
  // Screenshot before saving
  await page.screenshot({ path: '/tmp/before_save.png', fullPage: true });
  
  // Click Save button
  console.log('Saving...');
  const saveBtn = page.locator('button:has-text("Save")').first();
  if (await saveBtn.count() > 0) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    console.log('Saved configuration');
  }
  
  // Final screenshot
  await page.screenshot({ path: '/tmp/fhir_enabled.png', fullPage: true });
  console.log('Final screenshot saved');
  
  await browser.close();
  console.log('Done!');
})();
