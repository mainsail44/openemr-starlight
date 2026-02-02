const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const BASE_URL = 'http://192.168.1.46:8084';
  
  try {
    // 1. Login
    console.log('Logging in to OpenEMR...');
    await page.goto(`${BASE_URL}/interface/login/login.php?site=default`);
    await page.waitForSelector('input[name="authUser"]', { timeout: 10000 });
    await page.fill('input[name="authUser"]', 'admin');
    await page.fill('input[name="clearPass"]', 'pass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    console.log('Logged in');

    // 2. Go to globals
    console.log('Navigating to globals...');
    await page.goto(`${BASE_URL}/interface/super/edit_globals.php`);
    await page.waitForTimeout(2000);
    
    // 3. Click Connectors tab
    console.log('Clicking Connectors tab...');
    await page.click('text=Connectors');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/connectors_tab.png', fullPage: true });
    console.log('Screenshot: /tmp/connectors_tab.png');
    
    // 4. Look for REST API settings
    const content = await page.content();
    
    // Find and enable REST API checkbox
    const restApiCheckbox = await page.$('input[name*="rest_api"]') || 
                            await page.$('input[name*="enable_api"]') ||
                            await page.$('input[id*="rest_api"]');
    
    if (restApiCheckbox) {
      const isChecked = await restApiCheckbox.isChecked();
      console.log('REST API checkbox found, currently:', isChecked ? 'enabled' : 'disabled');
      if (!isChecked) {
        await restApiCheckbox.click();
        console.log('Enabled REST API');
      }
    }
    
    // Find FHIR API checkbox
    const fhirCheckbox = await page.$('input[name*="fhir"]') ||
                         await page.$('input[id*="fhir"]');
    if (fhirCheckbox) {
      const isChecked = await fhirCheckbox.isChecked();
      console.log('FHIR checkbox found, currently:', isChecked ? 'enabled' : 'disabled');
      if (!isChecked) {
        await fhirCheckbox.click();
        console.log('Enabled FHIR API');
      }
    }
    
    // List all form inputs to find API-related ones
    const inputs = await page.$$eval('input[type="checkbox"]', els => 
      els.map(el => ({ 
        name: el.name, 
        id: el.id, 
        checked: el.checked,
        label: el.closest('tr')?.innerText?.slice(0, 100) 
      }))
    );
    
    console.log('\nAPI-related checkboxes:');
    inputs.filter(i => 
      i.name?.toLowerCase().includes('api') || 
      i.name?.toLowerCase().includes('fhir') ||
      i.name?.toLowerCase().includes('rest') ||
      i.label?.toLowerCase().includes('api') ||
      i.label?.toLowerCase().includes('fhir')
    ).forEach(i => console.log(`  [${i.checked ? 'x' : ' '}] ${i.name} - ${i.label?.slice(0, 60)}`));
    
    // 5. Save settings
    const saveButton = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
    if (saveButton) {
      console.log('\nSaving settings...');
      await saveButton.click();
      await page.waitForTimeout(3000);
      console.log('Settings saved');
    }
    
    // 6. Now navigate to API clients registration
    console.log('\nLooking for Client Registration...');
    
    // Try the OAuth2 client registration page
    await page.goto(`${BASE_URL}/oauth2/default/registration`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/oauth_registration.png', fullPage: true });
    console.log('OAuth registration page screenshot: /tmp/oauth_registration.png');
    
    const regContent = await page.content();
    console.log('Registration page title:', await page.title());
    
    // Check if we can register a client
    if (regContent.includes('registration') || regContent.includes('client')) {
      console.log('Found registration page');
      
      // Fill registration form
      const clientName = await page.$('input[name*="client_name"]') || await page.$('input[name*="name"]');
      if (clientName) {
        await clientName.fill('FHIR Bridge');
      }
      
      const redirectUri = await page.$('input[name*="redirect"]');
      if (redirectUri) {
        await redirectUri.fill('http://192.168.1.46:8085/callback');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/openemr_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
