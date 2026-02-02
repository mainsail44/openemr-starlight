const { chromium } = require('playwright');

// Generate 100 random patients
const firstNames = ['James', 'Mary', 'Michael', 'Patricia', 'Robert', 'Jennifer', 'David', 'Linda', 'William', 'Elizabeth', 'Richard', 'Barbara', 'Joseph', 'Susan', 'Thomas', 'Jessica', 'Christopher', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy', 'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle', 'Kevin', 'Dorothy', 'Brian', 'Carol', 'George', 'Amanda', 'Timothy', 'Melissa', 'Ronald', 'Deborah'];
const lastNames = ['Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey'];
const cities = ['Alexandria', 'Arlington', 'Fairfax', 'Falls Church', 'Vienna', 'McLean', 'Reston', 'Herndon', 'Ashburn', 'Sterling'];

function randomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function generatePatients(count) {
  const patients = [];
  const usedNames = new Set();
  
  for (let i = 0; i < count; i++) {
    let fname, lname, fullName;
    do {
      fname = firstNames[Math.floor(Math.random() * firstNames.length)];
      lname = lastNames[Math.floor(Math.random() * lastNames.length)];
      fullName = `${fname} ${lname}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);
    
    patients.push({
      fname,
      lname,
      dob: randomDate(new Date(1940, 0, 1), new Date(2010, 0, 1)),
      sex: Math.random() > 0.5 ? 'Male' : 'Female',
      city: cities[Math.floor(Math.random() * cities.length)]
    });
  }
  return patients;
}

const PATIENTS = generatePatients(100);

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
  
  let created = 0;
  let failed = 0;
  
  for (let i = 0; i < PATIENTS.length; i++) {
    const patient = PATIENTS[i];
    
    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${PATIENTS.length} (${created} created, ${failed} failed)`);
    }
    
    try {
      await page.goto('http://192.168.1.46:8084/interface/new/new.php');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      // Fill form
      await page.fill('input[name="form_fname"]', patient.fname, { timeout: 3000 });
      await page.fill('input[name="form_lname"]', patient.lname, { timeout: 3000 });
      await page.fill('input[name="form_DOB"]', patient.dob, { timeout: 3000 });
      await page.selectOption('select[name="form_sex"]', patient.sex, { timeout: 3000 });
      
      // Click Create
      await page.click('button:has-text("Create New Patient")', { timeout: 5000 });
      await page.waitForTimeout(1000);
      
      created++;
    } catch (e) {
      failed++;
      console.log(`  Failed: ${patient.fname} ${patient.lname} - ${e.message.split('\n')[0]}`);
    }
  }
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${PATIENTS.length}`);
  
  await browser.close();
})();
