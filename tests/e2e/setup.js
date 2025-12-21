const { _electron: electron } = require('playwright');

const DATABASE_ID = 'e7d2ac35-4b6a-4392-a03f-6ede934c65bf';

/** Launches the Electron app and returns the window. */
async function launchApp() {
  const electronApp = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(3000);

  return { electronApp, window };
}

/** Navigates to the database table page. */
async function navigateToDatabase(window, databaseId = DATABASE_ID) {
  await window.evaluate((dbId) => {
    window.location.hash = `#/database/${dbId}`;
  }, databaseId);
  await window.waitForTimeout(2000);
}

/** Takes a screenshot and saves it to the specified path. */
async function takeScreenshot(window, filename = 'screenshot.png') {
  const path = `tests/e2e/screenshots/${filename}`;
  await window.screenshot({ path });
  console.log(`Screenshot saved to ${path}`);
  return path;
}

module.exports = {
  DATABASE_ID,
  launchApp,
  navigateToDatabase,
  takeScreenshot
};
