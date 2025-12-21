const { launchApp, navigateToDatabase, takeScreenshot } = require('./setup');

describe('Database Table', () => {
  let electronApp;
  let window;

  beforeAll(async () => {
    const app = await launchApp();
    electronApp = app.electronApp;
    window = app.window;
    await navigateToDatabase(window);
  }, 30000);

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should display the table with data', async () => {
    // Check that table exists
    const table = await window.$('.el-table');
    expect(table).toBeTruthy();

    // Check that rows are displayed
    const rows = await window.$$('.el-table__row');
    expect(rows.length).toBeGreaterThan(0);

    await takeScreenshot(window, 'table-basic.png');
  });

  test('should display filter bar with column chips', async () => {
    const filterBar = await window.$('.filter-bar');
    expect(filterBar).toBeTruthy();

    const chips = await window.$$('.filter-chip');
    expect(chips.length).toBeGreaterThan(0);

    await takeScreenshot(window, 'table-filter-bar.png');
  });

  test('should open column menu on header click', async () => {
    // Click on a column header
    const header = await window.$('.column-header');
    await header.click();
    await window.waitForTimeout(300);

    // Check that menu appeared
    const menu = await window.$('.column-context-menu');
    expect(menu).toBeTruthy();

    await takeScreenshot(window, 'table-column-menu.png');

    // Click elsewhere to close
    await window.click('body');
    await window.waitForTimeout(300);
  });

  test('should open filter dropdown when clicking filter chip', async () => {
    // Click on a filter chip
    const chip = await window.$('.filter-chip');
    await chip.click();
    await window.waitForTimeout(300);

    // Check that filter dropdown appeared
    const dropdown = await window.$('.filter-dropdown');
    expect(dropdown).toBeTruthy();

    await takeScreenshot(window, 'table-filter-dropdown.png');

    // Click elsewhere to close
    await window.click('.filter-bar');
    await window.waitForTimeout(300);
  });
});
