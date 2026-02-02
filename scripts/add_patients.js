const { chromium } = require('playwright');

const PATIENTS = [
  {
    fname: 'John',
    mname: 'William', 
    lname: 'Smith',
    dob: '1985-04-15',
    sex: 'Male',
    phone: '555-123-4567',
    email: 'john.smith@example.com'
  },
  {
    fname: 'Sarah',
    mname: 'Marie',
    lname: 'Johnson', 
    dob: '1990-08-22',
    sex: 'Female',
    phone: '555-987-6543',
    email: 'sarah.j@example.com'
  },
  {
    fname: 'Robert',
    mname: '',
    lname: 'Williams',
    dob: '1972-12-03',
    sex: 'Male',
    phone: '555-555-5555',
    email: 'robert.w@example.com'
  }
];

async function fillIfVisible(page, selector, value) {
  const el = page.locator(selector);
  if (await el.count() > 0) {
    try {
      // Scroll into view first
      await el.scrollIntoViewIfNeeded({ timeout: 2000 });
      await el.fill(value, { timeout: 5000 });
      return true;
    } catch (e) {
      console.log(`  Could not fill ${selector}: ${e.message.split('\n')[0]}`);
      return false;
    }
  }
  return false;
}

async function selectIfVisible(page, selector, value) {
  const el = page.locator(selector);
  if (await el.count() > 0) {
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 2000 });
      await el.selectOption(value, { timeout: 5000 });
      return true;
    } catch (e) {
      console.log(`  Could not select ${selector}: ${e.message.split('\n')[0]}`);
      return false;
    }
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Logging into OpenEMR...');
  await page.goto('http://192.168.1.46:8084/interface/login/login.php?site=default');
  await page.fill('input[name="authUser"]', 'admin');
  await page.fill('input[name="clearPass"]', 'pass');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  for (const patient of PATIENTS) {
    console.log(`\nAdding patient: ${patient.fname} ${patient.lname}...`);
    
    // Navigate to new patient page
    await page.goto('http://192.168.1.46:8084/interface/new/new.php');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of the form
    await page.screenshot({ path: `/tmp/newpatient_form.png`, fullPage: true });
    
    // Fill basic demographics (these should be visible)
    await fillIfVisible(page, 'input[name="form_fname"]', patient.fname);
    await fillIfVisible(page, 'input[name="form_mname"]', patient.mname);
    await fillIfVisible(page, 'input[name="form_lname"]', patient.lname);
    await fillIfVisible(page, 'input[name="form_DOB"]', patient.dob);
    await selectIfVisible(page, 'select[name="form_sex"]', patient.sex);
    
    // Try to fill contact info
    await fillIfVisible(page, 'input[name="form_phone_home"]', patient.phone);
    await fillIfVisible(page, 'input[name="form_email"]', patient.email);
    
    // Screenshot before save
    await page.screenshot({ path: `/tmp/patient_${patient.lname.toLowerCase()}_form.png` });
    
    // Find and click Create/Save button - look for various button types
    const buttons = [
      'button:has-text("Create New Patient")',
      'button:has-text("Create")',
      'button:has-text("Save")',
      'input[type="submit"][value*="Create"]',
      'input[type="button"][value*="Create"]',
      '#create',
      '.btn-save',
      'button[type="submit"]'
    ];
    
    let saved = false;
    for (const btnSelector of buttons) {
      const btn = page.locator(btnSelector).first();
      if (await btn.count() > 0) {
        try {
          await btn.scrollIntoViewIfNeeded({ timeout: 2000 });
          const isVisible = await btn.isVisible();
          if (isVisible) {
            await btn.click({ timeout: 5000 });
            await page.waitForTimeout(3000);
            console.log(`✓ Clicked ${btnSelector}`);
            saved = true;
            break;
          }
        } catch (e) {
          // Try next button
        }
      }
    }
    
    if (!saved) {
      console.log(`✗ Could not find save button for ${patient.fname} ${patient.lname}`);
    }
    
    // Screenshot after save
    await page.screenshot({ path: `/tmp/patient_${patient.lname.toLowerCase()}_saved.png` });
  }
  
  console.log('\nDone!');
  await browser.close();
})();
