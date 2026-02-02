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
    
    // 4. Get all rows with checkboxes and their text
    const rows = await page.$$('tr');
    console.log(`Found ${rows.length} rows`);
    
    const targetSettings = [
      'Enable OpenEMR Standard FHIR REST API',
      'Enable OpenEMR Standard REST API',
      'Enable OAuth2 Password Grant',
      'Enable OpenEMR Patient Portal REST API'
    ];
    
    for (const row of rows) {
      const text = await row.innerText().catch(() => '');
      
      for (const target of targetSettings) {
        if (text.includes(target)) {
          console.log(`\nFound: "${target}"`);
          const checkbox = await row.$('input[type="checkbox"]');
          if (checkbox) {
            const isChecked = await checkbox.isChecked();
            console.log(`  Status: ${isChecked ? 'enabled' : 'disabled'}`);
            if (!isChecked) {
              await checkbox.click();
              console.log(`  ✓ ENABLED`);
            }
          }
        }
      }
    }
    
    await page.screenshot({ path: '/tmp/after_enable.png', fullPage: true });
    
    // 5. Save
    console.log('\n--- Saving settings ---');
    await page.click('button.btn-primary');
    await page.waitForTimeout(5000);
    console.log('Saved!');
    
    // 6. Verify by reloading
    console.log('\n--- Verifying settings ---');
    await page.goto(`${BASE_URL}/interface/super/edit_globals.php`);
    await page.waitForTimeout(2000);
    await page.click('text=Connectors');
    await page.waitForTimeout(2000);
    
    // Check the FHIR API checkbox state
    const fhirRow = await page.$('tr:has-text("Enable OpenEMR Standard FHIR REST API")');
    if (fhirRow) {
      const fhirCheckbox = await fhirRow.$('input[type="checkbox"]');
      if (fhirCheckbox) {
        const isEnabled = await fhirCheckbox.isChecked();
        console.log(`FHIR REST API is now: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
      }
    }
    
    await page.screenshot({ path: '/tmp/verified.png', fullPage: true });
    
    // 7. Test API
    console.log('\n--- Testing FHIR API ---');
    const testResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('http://192.168.1.46:8084/apis/default/fhir/metadata');
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { status: 0, error: e.message };
      }
    });
    
    console.log('FHIR Metadata test:', testResponse.status, testResponse.ok ? 'OK' : 'FAILED');
    
    // 8. Register OAuth2 client if API is working
    if (testResponse.ok) {
      console.log('\n--- Registering OAuth2 Client ---');
      
      const registrationData = {
        application_type: "private",
        redirect_uris: ["http://192.168.1.46:8085/callback"],
        client_name: "FHIR Bridge",
        token_endpoint_auth_method: "client_secret_post",
        contacts: ["admin@localhost"],
        scope: "openid fhirUser offline_access api:fhir"
      };
      
      const regResponse = await page.evaluate(async (data) => {
        try {
          const res = await fetch('http://192.168.1.46:8084/oauth2/default/registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return { status: res.status, body: await res.text() };
        } catch (e) {
          return { status: 0, body: e.message };
        }
      }, registrationData);
      
      console.log('Registration response:', regResponse.status);
      
      if (regResponse.status === 200 || regResponse.status === 201) {
        const clientInfo = JSON.parse(regResponse.body);
        console.log('\n========================================');
        console.log('SUCCESS: OAuth2 Client Created!');
        console.log('========================================');
        console.log('Client ID:', clientInfo.client_id);
        console.log('Client Secret:', clientInfo.client_secret);
        console.log('========================================');
        
        const fs = require('fs');
        fs.writeFileSync('/tmp/oauth2_client.json', JSON.stringify(clientInfo, null, 2));
        console.log('\nSaved to /tmp/oauth2_client.json');
      } else {
        console.log('Response:', regResponse.body);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
