import {test, expect} from '@playwright/test';

test('idle scene keeps drawing while unchanged text boxes are cached', async ({playwright}) => {
  test.setTimeout(60000);
  const browser = await playwright.chromium.launch({args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  ]});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    await page.goto('http://127.0.0.1:4321/');
    await expect(page.locator('html')).toHaveClass(/webgl/, {timeout: 30000});
    await page.waitForTimeout(6000);
    const probe = await page.evaluate(async () => {
      const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
      const gl = canvas.getContext('webgl2')!;
      const rect = Element.prototype.getBoundingClientRect;
      const draw = gl.drawElements.bind(gl);
      let reads = 0, draws = 0;
      Element.prototype.getBoundingClientRect = function () {reads++; return rect.call(this);};
      gl.drawElements = (...args) => {draws++; draw(...args);};
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {reads, draws, width: canvas.width, height: canvas.height};
      } finally {
        Element.prototype.getBoundingClientRect = rect;
        gl.drawElements = draw;
      }
    });
    expect(probe.draws).toBeGreaterThan(0);
    expect(probe.reads).toBeLessThan(12);
    expect(probe.width).toBe(1440);
    expect(probe.height).toBe(900);
  } finally {await browser.close();}
});
