// Browser tests for Plush Squad. The game is static files, so the web server is a plain python http.server.
// Headless Chromium renders Phaser through SwiftShader (2-3 fps in small VMs), hence the long timeouts.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 360000,
  expect: { timeout: 30000 },
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:8765',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: { command: 'python3 -m http.server 8765', url: 'http://localhost:8765/index.html', reuseExistingServer: true, timeout: 30000 },
});
