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
    
    // 4. Find all checkbox names
    const allCheckboxes = await page.$$eval('input[type="checkbox"]', els => 
      els.map(el => ({
        name: el.name,
        id: el.id,
        checked: el.checked
      }))
    );
    
    // Filter for API-related
    const apiCheckboxes = allCheckboxes.filter(c => 
      c.name?.toLowerCase().includes('api') || 
      c.name?.toLowerCase().includes('fhir') ||
      c.name?.toLowerCase().includes('rest') ||
      c.name?.toLowerCase().includes('oauth')
    );
    
    console.log('API-related checkboxes found:');
    apiCheckboxes.forEach(c => console.log(`  [${c.checked ? 'x' : ' '}] ${c.name}`));
    
    // 5. Enable specific checkboxes by name pattern
    const toEnable = [
      'rest_fhir_api',
      'rest_api',
      'oauth_password_grant',
      'rest_portal_api'
    ];
    
    for (const pattern of toEnable) {
      const matches = apiCheckboxes.filter(c => c.name?.includes(pattern));
      for (const match of matches) {
        if (!match.checked) {
          console.log(`Enabling: ${match.name}`);
          await page.check(`input[name="${match.name}"]`);
        }
      }
    }
    
    // Also try by full name from screenshot
    const exactNames = [
      'form_rest_fhir_api',
      'form_rest_api', 
      'form_oauth_password_grant',
      'form_rest_portal_api'
    ];
    
    for (const name of exactNames) {
      try {
        const checkbox = await page.$(`input[name="${name}"]`);
        if (checkbox) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.click();
            console.log(`✓ Enabled ${name}`);
          } else {
            console.log(`Already enabled: ${name}`);
          }
        }
      } catch (e) {
        // Checkbox not found
      }
    }
    
    await page.screenshot({ path: '/tmp/checkboxes_state.png', fullPage: true });
    
    // 6. Save
    console.log('\nSaving...');
    const saveBtn = await page.$('button.btn-primary') || await page.$('button:has-text("Save")');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(3000);
      console.log('Saved!');
    }
    
    // 7. Now try OAuth2 registration again
    console.log('\n--- Attempting OAuth2 Registration ---');
    
    // Navigate to registration endpoint directly
    await page.goto(`${BASE_URL}/oauth2/default/registration`);
    await page.waitForTimeout(2000);
    
    const pageContent = await page.content();
    console.log('Registration page status');
    
    // Make the API call directly
    const registrationData = {
      application_type: "private",
      redirect_uris: ["http://192.168.1.46:8085/callback"],
      client_name: "FHIR Bridge",
      token_endpoint_auth_method: "client_secret_post",
      contacts: ["admin@localhost"],
      scope: "openid fhirUser offline_access api:fhir"
    };
    
    const response = await page.evaluate(async (data) => {
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
    
    console.log('Registration response:', response.status);
    
    if (response.status === 200 || response.status === 201) {
      const clientInfo = JSON.parse(response.body);
      console.log('\n=== SUCCESS: OAuth2 Client Created ===');
      console.log('Client ID:', clientInfo.client_id);
      console.log('Client Secret:', clientInfo.client_secret);
      
      const fs = require('fs');
      fs.writeFileSync('/tmp/oauth2_client.json', JSON.stringify(clientInfo, null, 2));
      console.log('\nSaved to /tmp/oauth2_client.json');
    } else {
      console.log('Response:', response.body);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
