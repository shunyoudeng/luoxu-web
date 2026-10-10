import {test, expect} from '@playwright/test';

test('text remains untransformed through hover and press while icon feedback settles', async ({page}) => {
  await page.setViewportSize({width:1440, height:1000});
  await page.goto('/');
  const button = page.locator('.desktop-nav .button');
  const width = await button.evaluate(el => (el as HTMLElement).offsetWidth);
  const transform = () => button.evaluate(el => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return {scale:matrix.a, y:matrix.f};
  });
  await button.hover();
  await expect.poll(async () => (await transform()).scale).toBeCloseTo(1, 2);
  await page.waitForTimeout(420);
  expect((await transform()).y).toBeCloseTo(0, 1);
  expect(await button.locator('svg').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).f)).toBeCloseTo(-2, 1);
  expect(await button.evaluate(el => (el as HTMLElement).offsetWidth)).toBe(width);
  await page.mouse.down();
  await expect.poll(async () => (await transform()).scale).toBeCloseTo(1, 2);
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await expect.poll(async () => (await transform()).scale).toBeCloseTo(1, 2);
  await page.waitForTimeout(300);
  expect((await transform()).y).toBeCloseTo(0, 1);
  // Rapid hover/leave on adjacent links must not queue or accumulate transforms.
  const links = page.locator('.desktop-nav .nav-link');
  for (let i=0; i<10; i++) {await links.nth(i%4).hover();await page.waitForTimeout(20);}
  await page.mouse.move(5, 5);
  await page.waitForTimeout(450);
  expect(await links.evaluateAll(elements => elements.every(el => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return Math.abs(m.a-1)<.001 && Math.abs(m.f)<.1;
  }))).toBe(true);
});

test('navigation uses a fine indicator and visible focus without changing text width', async ({page}) => {
  await page.setViewportSize({width:1366, height:900});
  await page.goto('/');
  const current = page.locator('.desktop-nav [aria-current=page]');
  expect(await current.evaluate(el => getComputedStyle(el,'::after').opacity)).toBe('1');
  const target = page.locator('.desktop-nav .nav-link').nth(1);
  const width = await target.evaluate(el => (el as HTMLElement).offsetWidth);
  await target.hover();
  await page.waitForTimeout(420);
  expect(Number(await target.evaluate(el => getComputedStyle(el,'::after').opacity))).toBeGreaterThan(.5);
  expect(await target.evaluate(el => (el as HTMLElement).offsetWidth)).toBe(width);
  await page.mouse.move(5,5);
  await target.focus();
  expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
});

test('touch devices have no sticky hover and menu closes with Escape, outside tap and resize', async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true});
  const page = await context.newPage();
  await page.goto('/');
  expect(await page.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches)).toBe(false);
  await page.getByRole('tab',{name:'作业',exact:true}).tap();
  await page.waitForTimeout(400);
  expect(await page.getByRole('tab',{name:'作业',exact:true}).evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(1);
  const summary = page.getByLabel('打开网站导航');
  await summary.tap();
  await expect(summary).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(summary).toHaveAttribute('aria-expanded','false');
  await summary.tap();
  // The menu overlaps the heading's centre; tap its exposed left edge.
  await page.locator('h1').tap({position:{x:8,y:8}});
  await expect(summary).toHaveAttribute('aria-expanded','false');
  await summary.tap();
  await page.setViewportSize({width:768,height:900});
  await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open','');
  await page.setViewportSize({width:390,height:900});
  await expect(page.getByRole('navigation',{name:'移动导航'})).not.toBeVisible();
  await context.close();
});

for (const width of [375,390,412,768,1366,1440]) test(`illustration tabs preserve device height at ${width}px`,async ({page}) => {
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  const heights:number[]=[];
  for (const name of ['任务','作业','机会','校园信息']) {
    await page.getByRole('tab',{name,exact:true}).click();
    heights.push(await page.locator('.device').evaluate(el => el.getBoundingClientRect().height));
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  }
  expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('scroll reveal is once-only and offscreen content is never initially hidden', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const heading=page.locator('.privacy-story h2');
  expect(await heading.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  expect(await heading.evaluate(el => getComputedStyle(el).filter)).toBe('none');
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute('data-revealed','true');
  expect(await heading.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  expect(await heading.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.waitForTimeout(450);
  await page.evaluate(() => scrollTo(0,0));
  await page.waitForTimeout(450);
  await heading.scrollIntoViewIfNeeded();
  expect(await heading.evaluate(el => el.getAnimations().length)).toBe(0);
});

test('reduced motion removes transforms even while hovered and keeps copy readable', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const button=page.locator('.desktop-nav .button');
  await button.hover();
  expect(await button.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await page.locator('.privacy-story h2').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.locator('.privacy-story h2')).toBeVisible();
});

test('content remains available without JavaScript or IntersectionObserver', async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.privacy-story h2')).toBeVisible();
  await expect(page.getByRole('tabpanel')).toContainText('提交团日活动材料');
  await page.getByLabel('打开网站导航').click();
  await expect(page.getByRole('navigation',{name:'移动导航'})).toBeVisible();
  await context.close();
  const fallback=await browser.newPage();
  const errors:string[]=[];fallback.on('pageerror', e => errors.push(e.message));
  await fallback.addInitScript(() => {Object.defineProperty(window,'IntersectionObserver',{value:undefined});});
  await fallback.goto('/');
  await expect(fallback.locator('.privacy-story h2')).toBeVisible();
  expect(errors).toEqual([]);
  await fallback.close();
});
