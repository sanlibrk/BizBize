const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

// No accounts or running backend are needed: this exercises the auth screens.
const base = process.env.AUTH_TEST_URL || 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {}),
  });
  const errors = [], results = [];
  await fs.mkdir('browser-results', { recursive: true });
  try {
    for (const width of [390, 1280]) for (const translated of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://images.unsplash.com/**', route => route.abort());
      const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
      const html = await response.text();
      assert.match(html, /<html\b[^>]*\blang="tr"/);
      assert.match(html, /<html\b[^>]*\btranslate="no"/);
      assert.match(html, /<meta\s+name="google"\s+content="notranslate"/);
      await page.getByRole('button', { name: 'Zaten hesabım var', exact: true }).waitFor();
      if (translated) {
        // Translators replace React-owned text nodes with <font> elements.
        // The old welcome heading then crashed on the first login transition.
        const wrapped = await page.evaluate(() => {
          const heading = [...document.querySelectorAll('div')].find(el => el.textContent === 'Aynı hikâyenin\niki güzel yanı.');
          if (!heading) throw new Error('Welcome heading was not found');
          let count = 0;
          for (const child of [...heading.childNodes]) if (child.nodeType === Node.TEXT_NODE) {
            const font = document.createElement('font');
            font.textContent = child.textContent;
            heading.replaceChild(font, child);
            count++;
          }
          return count;
        });
        assert.ok(wrapped > 0, 'Translation mutation must actually replace a text node');
      }
      await page.getByRole('button', { name: 'Zaten hesabım var', exact: true }).click();
      await page.getByRole('button', { name: 'Giriş yap', exact: true }).waitFor();
      await page.getByLabel('E-posta', { exact: true }).fill('navigation@example.test');
      await page.getByRole('button', { name: 'Yeni misin? Hesap oluştur', exact: true }).click();
      await page.getByRole('checkbox').waitFor();
      assert.equal(await page.getByLabel('E-posta', { exact: true }).inputValue(), 'navigation@example.test');
      await page.getByRole('button', { name: 'Hesabın var mı? Giriş yap', exact: true }).click();
      await page.getByRole('button', { name: 'Şifremi unuttum', exact: true }).click();
      assert.equal(await page.getByLabel('Şifre', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Yenileme bağlantısı gönder', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Geri', exact: true }).click();
      await page.getByRole('button', { name: 'Birlikte başlayalım', exact: true }).click();
      await page.getByRole('checkbox').waitFor();
      await page.getByRole('button', { name: 'Geri', exact: true }).click();
      await page.getByRole('button', { name: 'Zaten hesabım var', exact: true }).click();
      await page.getByRole('button', { name: 'Giriş yap', exact: true }).waitFor();
      if (width === 390 && translated) await page.screenshot({ path: 'browser-results/auth-login.png' });
      results.push({ width, translated, login: true, signup: true, reset: true, back: true });
      await context.close();
    }
    assert.deepEqual(errors, [], 'Auth transitions must not produce browser runtime errors');
    await fs.writeFile('browser-results/auth-result.json', JSON.stringify({ results, errors }, null, 2));
    console.log('Auth navigation passed at phone/desktop widths, including translated-DOM regression.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
