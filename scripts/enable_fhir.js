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
    
    // 4. Enable FHIR REST API
    console.log('Looking for FHIR checkboxes...');
    
    // Get all checkboxes with their labels
    const checkboxes = await page.$$('input[type="checkbox"]');
    console.log(`Found ${checkboxes.length} checkboxes`);
    
    for (const checkbox of checkboxes) {
      const row = await checkbox.evaluateHandle(el => el.closest('tr'));
      const rowText = await row.evaluate(el => el?.innerText || '');
      
      // Enable FHIR REST API
      if (rowText.includes('Enable OpenEMR Standard FHIR REST API')) {
        const isChecked = await checkbox.isChecked();
        console.log(`FHIR REST API: ${isChecked ? 'enabled' : 'disabled'}`);
        if (!isChecked) {
          await checkbox.click();
          console.log('✓ Enabled FHIR REST API');
        }
      }
      
      // Enable Standard REST API
      if (rowText.includes('Enable OpenEMR Standard REST API') && !rowText.includes('FHIR')) {
        const isChecked = await checkbox.isChecked();
        console.log(`Standard REST API: ${isChecked ? 'enabled' : 'disabled'}`);
        if (!isChecked) {
          await checkbox.click();
          console.log('✓ Enabled Standard REST API');
        }
      }
      
      // Enable OAuth2 Password Grant
      if (rowText.includes('Enable OAuth2 Password Grant')) {
        const isChecked = await checkbox.isChecked();
        console.log(`OAuth2 Password Grant: ${isChecked ? 'enabled' : 'disabled'}`);
        if (!isChecked) {
          await checkbox.click();
          console.log('✓ Enabled OAuth2 Password Grant');
        }
      }
    }
    
    await page.screenshot({ path: '/tmp/fhir_enabled.png', fullPage: true });
    
    // 5. Save settings
    console.log('\nSaving settings...');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);
    console.log('Settings saved!');
    
    await page.screenshot({ path: '/tmp/fhir_saved.png', fullPage: true });
    
    // 6. Now register an OAuth2 client via API
    console.log('\n--- OAuth2 Client Registration ---');
    
    // OpenEMR uses dynamic client registration
    // POST to /oauth2/default/registration
    const registrationData = {
      application_type: "private",
      redirect_uris: ["http://192.168.1.46:8085/callback"],
      initiate_login_uri: "http://192.168.1.46:8085/login",
      post_logout_redirect_uris: ["http://192.168.1.46:8085/logout"],
      client_name: "FHIR Bridge",
      token_endpoint_auth_method: "client_secret_post",
      contacts: ["admin@localhost"],
      scope: "openid fhirUser launch offline_access api:fhir api:oemr"
    };
    
    console.log('Registering OAuth2 client via API...');
    
    // Use fetch to register
    const response = await page.evaluate(async (data) => {
      const res = await fetch('http://192.168.1.46:8084/oauth2/default/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return { status: res.status, body: await res.text() };
    }, registrationData);
    
    console.log('Registration response:', response.status);
    console.log('Response body:', response.body);
    
    if (response.status === 200 || response.status === 201) {
      const clientInfo = JSON.parse(response.body);
      console.log('\n=== OAuth2 Client Created ===');
      console.log('Client ID:', clientInfo.client_id);
      console.log('Client Secret:', clientInfo.client_secret);
      console.log('Registration Token:', clientInfo.registration_access_token);
      
      // Save to file
      const fs = require('fs');
      fs.writeFileSync('/tmp/oauth2_client.json', JSON.stringify(clientInfo, null, 2));
      console.log('\nCredentials saved to /tmp/oauth2_client.json');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/openemr_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
