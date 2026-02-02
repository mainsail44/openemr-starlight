const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const BASE_URL = 'http://192.168.1.46:8084';
  
  try {
    // Login
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/interface/login/login.php?site=default`);
    await page.waitForSelector('input[name="authUser"]');
    await page.fill('input[name="authUser"]', 'admin');
    await page.fill('input[name="clearPass"]', 'pass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Go to globals connectors
    await page.goto(`${BASE_URL}/interface/super/edit_globals.php`);
    await page.waitForTimeout(2000);
    await page.click('text=Connectors');
    await page.waitForTimeout(2000);
    
    // Dump ALL input elements with their context
    const inputs = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('input').forEach(input => {
        const parent = input.closest('div') || input.closest('td') || input.parentElement;
        const label = parent?.querySelector('label')?.innerText || '';
        const prevText = input.previousSibling?.textContent?.trim() || '';
        const parentText = parent?.innerText?.slice(0, 200) || '';
        
        results.push({
          type: input.type,
          name: input.name,
          id: input.id,
          value: input.value,
          checked: input.checked,
          label: label,
          context: parentText
        });
      });
      return results;
    });
    
    // Filter for API/OAuth/FHIR related
    const apiInputs = inputs.filter(i => {
      const searchText = `${i.name} ${i.id} ${i.label} ${i.context}`.toLowerCase();
      return searchText.includes('api') || 
             searchText.includes('oauth') || 
             searchText.includes('fhir') ||
             searchText.includes('rest') ||
             searchText.includes('registration');
    });
    
    console.log('\n=== API/OAuth/FHIR Related Settings ===\n');
    apiInputs.forEach(i => {
      if (i.type === 'checkbox') {
        console.log(`[${i.checked ? 'x' : ' '}] ${i.name || i.id}`);
        console.log(`    Context: ${i.context.slice(0, 100)}`);
        console.log('');
      } else if (i.type !== 'hidden') {
        console.log(`${i.name || i.id}: "${i.value}"`);
        console.log(`    Context: ${i.context.slice(0, 100)}`);
        console.log('');
      }
    });
    
    // Also look for <select> dropdowns
    const selects = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('select').forEach(select => {
        const parent = select.closest('div') || select.closest('td') || select.parentElement;
        const parentText = parent?.innerText?.slice(0, 200) || '';
        const options = Array.from(select.options).map(o => ({ value: o.value, text: o.text, selected: o.selected }));
        
        results.push({
          name: select.name,
          id: select.id,
          context: parentText,
          options: options,
          selectedValue: select.value
        });
      });
      return results;
    });
    
    const oauthSelects = selects.filter(s => {
      const searchText = `${s.name} ${s.id} ${s.context}`.toLowerCase();
      return searchText.includes('oauth') || searchText.includes('api');
    });
    
    console.log('\n=== OAuth/API Dropdowns ===\n');
    oauthSelects.forEach(s => {
      console.log(`${s.name}: "${s.selectedValue}"`);
      console.log(`    Options: ${s.options.map(o => o.text).join(', ')}`);
      console.log(`    Context: ${s.context.slice(0, 100)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
