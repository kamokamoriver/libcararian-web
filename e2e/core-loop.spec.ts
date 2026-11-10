import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';

const fixture = (name: string) => join(import.meta.dirname, '..', 'compat', 'fixtures', name);
const shots = (name: string) => join(import.meta.dirname, '..', 'test-results', 'shots', name);

async function addFixtures(page: Page) {
  await page.getByTestId('file-input').setInputFiles([fixture('a4_score.pdf'), fixture('rotated.pdf'), fixture('b5_small.pdf')]);
  await expect(page.locator('.group')).toHaveCount(3);
  await expect(page.getByText('通し 11 ページ', { exact: false })).toBeVisible();
}

test('PDFを追加し、白紙を入れて小冊子を確認・ダウンロードできる', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('./');
  await expect(page.getByText('PDFをここにドロップ')).toBeVisible();
  await page.screenshot({ path: shots('01-empty.png') });

  await addFixtures(page);
  // 1つ目のファイルの2ページ目と3ページ目の間に白紙
  await page.locator('.group').first().getByRole('button', { name: 'ここに白紙を入れる' }).nth(2).click();
  await expect(page.getByText('通し 12 ページ', { exact: false })).toBeVisible();
  await expect(page.locator('.thumb-blank')).toHaveCount(1);

  await page.getByLabel('小冊子にする（B4見開き・中綴じ）').check();
  await page.getByLabel('ページ番号を付ける').check();
  await page.screenshot({ path: shots('02-list.png') });

  await page.getByRole('button', { name: '確認', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '出力の確認' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('結合ファイル.pdf（6面（B4））')).toBeVisible();
  await expect(dialog.locator('img.preview-sheet')).toBeVisible();
  await page.screenshot({ path: shots('03-preview.png') });

  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'ダウンロード' }).click();
  expect((await download).suggestedFilename()).toBe('結合ファイル.pdf');

  await dialog.getByRole('button', { name: '閉じる' }).click();
  // 設定を変えると結果は古くなり、もう一度「確認」が必要になる
  await page.getByLabel('ページ番号を付ける').uncheck();
  await expect(page.getByRole('button', { name: '確認', exact: true })).toBeEnabled();

  expect(errors).toEqual([]);
});

test('曲ごと分割は入力ミスを実行前に示し、直すとZIPを出力する', async ({ page }) => {
  await page.goto('./');
  await addFixtures(page);
  await page.getByRole('tab', { name: '曲ごと' }).click();

  await page.getByLabel('1行目の曲名').fill('はじまりの歌');
  await page.getByLabel('1行目の開始ページ').fill('1');
  await page.getByLabel('1行目の終了ページ').fill('3');
  await page.getByRole('button', { name: '曲を追加' }).click();
  await expect(page.getByLabel('2行目のNo.')).toHaveValue('2');
  await expect(page.getByLabel('2行目の開始ページ')).toHaveValue('4');
  await page.getByLabel('2行目の曲名').fill('春:夏');
  await page.getByLabel('2行目の終了ページ').fill('8');

  await expect(page.getByText('曲名に使えない文字', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '確認', exact: true })).toBeDisabled();
  await page.screenshot({ path: shots('04-songs-error.png') });

  await page.getByLabel('2行目の曲名').fill('春');
  await page.getByRole('button', { name: '確認', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '出力の確認' });
  await expect(dialog.getByText('2ファイル → 曲ごと.zip')).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'ダウンロード' }).click();
  expect((await download).suggestedFilename()).toBe('曲ごと.zip');
});

test('ページを回転すると、サムネイルと出力に反映される', async ({ page }) => {
  await page.goto('./');
  await addFixtures(page);
  // rotated.pdf の1ページ目（通しページ7）は横長に見える
  const thumb = page.getByAltText('通しページ 7');
  await expect(thumb).toBeVisible();
  const shape = () => thumb.evaluate((img: HTMLImageElement) => (img.naturalWidth > img.naturalHeight ? '横' : '縦'));
  expect(await shape()).toBe('横');

  await page.getByRole('button', { name: '通しページ 7 を右に90°回転' }).click();
  await expect(page.locator('.thumb-rotation')).toHaveText([' 90°']);
  await expect.poll(shape).toBe('縦');
  await page.screenshot({ path: shots('07-rotated.png') });

  // ファイル単位の回転（a4_score.pdf の6ページ）
  await page.getByRole('button', { name: 'a4_score.pdf の全ページを右に90°回転' }).click();
  await expect(page.locator('.thumb-rotation')).toHaveCount(7);

  await page.getByRole('button', { name: '確認', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '出力の確認' });
  await expect(dialog.getByText('結合ファイル.pdf（11ページ）')).toBeVisible();
  await expect(dialog.locator('img.preview-sheet')).toBeVisible();
  await page.screenshot({ path: shots('08-rotated-preview.png') });
});

test('ダークテーマと狭い画面でも崩れない', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await addFixtures(page);
  await page.screenshot({ path: shots('05-dark.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: shots('06-mobile.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
