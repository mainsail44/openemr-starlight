const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const BASE_URL = 'http://192.168.1.46:8084';
  
  try {
    // 1. Login to OpenEMR
    console.log('Navigating to OpenEMR...');
    await page.goto(`${BASE_URL}/interface/login/login.php?site=default`);
    
    // Wait for login form
    await page.waitForSelector('input[name="authUser"]', { timeout: 10000 });
    
    console.log('Logging in...');
    await page.fill('input[name="authUser"]', 'admin');
    await page.fill('input[name="clearPass"]', 'pass');
    await page.click('button[type="submit"]');
    
    // Wait for the main interface to load
    await page.waitForTimeout(5000);
    console.log('Login submitted, checking page...');
    
    // Take screenshot to see where we are
    await page.screenshot({ path: '/tmp/openemr_after_login.png', fullPage: true });
    console.log('Screenshot saved: /tmp/openemr_after_login.png');
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Navigate directly to API admin page
    console.log('Navigating to API Clients page...');
    await page.goto(`${BASE_URL}/interface/super/manage_site_files.php`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/openemr_admin_page.png', fullPage: true });
    
    // Try the system admin
    await page.goto(`${BASE_URL}/interface/modules/zend_modules/public/Installer/setup?site=default`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/openemr_modules.png', fullPage: true });
    
    // Go to globals/features to enable API
    await page.goto(`${BASE_URL}/interface/super/edit_globals.php`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/openemr_globals.png', fullPage: true });
    console.log('Screenshot: /tmp/openemr_globals.png');
    
    // Look for Connectors/API tab
    const content = await page.content();
    if (content.includes('Connectors') || content.includes('API')) {
      console.log('Found API/Connectors section');
    }
    
    // List all links on page
    const links = await page.$$eval('a', as => as.map(a => ({ text: a.innerText?.trim(), href: a.href })));
    console.log('Available links (first 20):');
    links.slice(0, 20).forEach(l => console.log(`  - ${l.text}: ${l.href}`));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/openemr_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
