const { _electron: electron } = require('playwright');

const DATABASE_ID = 'e7d2ac35-4b6a-4392-a03f-6ede934c65bf';

(async () => {
  try {
    const electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);

    // Navigate directly to database page via URL hash
    await window.evaluate((dbId) => {
      window.location.hash = `#/database/${dbId}`;
    }, DATABASE_ID);

    await window.waitForTimeout(2000);

    await window.screenshot({ path: 'electron_screenshot.png' });
    console.log('Screenshot saved to electron_screenshot.png');

    await electronApp.close();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
