import {test, expect} from '@playwright/test';

test('name completes both full outlines and settles its words within the doubled-speed sequence', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const ink = page.locator('.story-stage .hw-complete');
  await expect(ink).toHaveCount(2);
  await expect(ink.first()).toHaveCSS('opacity', '0');
  await page.evaluate(() => scrollTo(0, document.querySelector('.story-stage')!.getBoundingClientRect().top + scrollY));
  await expect.poll(async () => page.locator('.story-stage').evaluate(stage => ({
    full: Array.from(stage.querySelectorAll('.hw-complete')).every(e => getComputedStyle(e).opacity === '1' && !e.hasAttribute('mask')),
    strokes: Array.from(stage.querySelectorAll('.hw-med')).every(e => getComputedStyle(e).strokeDashoffset === '0px'),
    words: Array.from(stage.querySelectorAll('.drift')).every(e => getComputedStyle(e).opacity === '1'),
  })), {timeout:3200, intervals:[50]}).toEqual({full:true,strokes:true,words:true});
  const shapes = await page.locator('.story-stage .hw').evaluateAll(svgs => svgs.every(svg =>
    svg.querySelector('.hw-complete')!.getAttribute('d') === svg.querySelector('.hw-fill')!.getAttribute('d') &&
    getComputedStyle(svg.querySelector('.hw-fill')!).opacity === '0'));
  expect(shapes).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(ink.first()).toHaveCSS('opacity','0');
});

test('manifesto keeps its sentence reveal and reading pause, then resolves twice as fast', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.evaluate(() => scrollTo(0, document.querySelector('.poster')!.getBoundingClientRect().top + scrollY));
  await page.waitForTimeout(2750);
  const fullSentence = await page.locator('.poster').evaluate(poster => ({
    lines: Array.from(poster.querySelectorAll('.poster-line')).map(e => getComputedStyle(e).opacity),
    strike: getComputedStyle(poster.querySelector('.strike')!).transform,
    tail: getComputedStyle(poster.querySelector('.poster-tail')!).opacity,
  }));
  expect(fullSentence.lines).toEqual(['1','1','1','1']);
  expect(fullSentence.strike).toBe('matrix(0, 0, 0, 1, 0, 0)');
  expect(fullSentence.tail).toBe('0');
  await expect(page.locator('.poster-tail')).toHaveCSS('opacity','1',{timeout:1800});
  for (const line of [0,1,2]) await expect(page.locator('.poster-line').nth(line)).toHaveCSS('opacity','0');
  await expect(page.locator('.poster-line').last()).toHaveCSS('opacity','1');
  await expect(page.locator('.strike')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator('.poster-tail')).toHaveCSS('opacity','0');
});
