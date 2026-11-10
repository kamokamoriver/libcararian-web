# PLAN: Libcararian Web

最終更新: 2026-11-10
**現在地:** MVP（S0〜S7）を実装した。残りは、GitHub への公開（リポジトリを作り push する）と、本番 URL でコアループを1周確かめること。どちらもユーザーの判断待ち。

> 2026-11-10 ユーザーから「以降、自律的に実装して」と指示を受けた。そのため、DESIGN と PLAN の承認ゲートは省き、DESIGN の「仮定」をそのまま採用して進めた。

## スライス一覧

### [x] S0 歩くスケルトン
- Vite・React・TypeScript の土台、`tokens.css` の生成、`npm run check`、空の画面。

### [x] S1 PDFを追加して一覧する（US-1, US-2）
- ボタンとドロップでの追加、重複と PDF 以外の除外、Worker での読み込み確認、読み込めないファイルの赤い表示。
- サムネイル（見えている分だけ描く。同時に描くのは4枚まで）、dnd-kit での並べ替え、名前順、外す、クリア（確認つき）。

### [x] S2 白紙の挿入（US-3）
- `arrangement.ts` とそのテスト。ページの間の「＋」、白紙の「取り除く」。

### [x] S3 小冊子・結合の出力（US-4, US-8）
- numbering・booklet・render・Worker・進捗・ダウンロード。
- compat: 結合と小冊子のケースは、すべて一致した（意図した差は2件）。
- 本番ビルドに CSP を入れた。

### [x] S4 確認画面（US-7）
- `<dialog>` で表示する。1枚ずつの表示と、ファイルの一覧。
- 並びや設定を変えたら、結果を捨てる。

### [x] S5 曲ごと分割（US-5）
- `validateSongs` とそのテスト、行ごとのエラーと注意、行を足したときの自動入力。ZIP で出力する。compat の songs が一致した。

### [x] S6 ページごと分割（US-6）
- B5 に変換するかを切り替えられる。compat の split_b5 と split_raw が一致した。

### [x] S7 仕上げ
- E2E 3本（小冊子の一連の操作／曲ごとの入力検証と ZIP／ダークテーマと 390px 幅）。
- README、CLAUDE.md、GitHub Pages 用のワークフロー（`.github/workflows/deploy.yml`）。

### [x] S8 ページの回転（US-9、2026-11-10 にユーザーの要望で追加）
- **データ:** `PageItem` に `rotation` を足した。`rotatePage` と `rotateGroup` とそのテストも書いた。
- **出力:** 元の `/Rotate` に回転を足して反映する。B5に変換しないページごと分割では、`/Rotate` に足す。
- **画面:** サムネイルを回転して描く。各ページに「回転」、各ファイルに「全ページ回転」を置き、回した角度を表示する。
- **同時に直した不具合:** 小冊子なしの結合でも、確認画面の単位が「面（B4）」と出ていた。
- **確認:**
  - 単体テスト28件が通った。
  - compat はすべて一致した（回転なしの出力は変わらない）。
  - E2E 4件が通った（回転で、サムネイルが横長から縦長に変わることを確認）。

## 完了ログ

- 2026-11-10: S0〜S7 を完了した。確かめた結果は次のとおり。
  - `npm run check`: 単体テスト23件が通った。
  - `npm run compat`: すべて一致した。
  - `npm run test:e2e`: 3件が通った。
  - Chrome での手動操作: 追加・白紙・ドラッグ・小冊子・曲ごと・ページごと・壊れたPDF。
- 未確認のもの:
  - 実在の楽譜PDF（スキャンした大きなファイル）での操作。
  - GitHub Pages 上での動作。

## 技術的負債・TODO

- **性能:**
  - 300ページの小冊子に、約9.5秒かかる（`compat/perf.ts`。Node での計測）。
  - 大半は pdf-lib の埋め込みと保存で、その間は進捗が動かない。改善するなら、保存の前後で進捗を細かく出すか、ページの写し方を見直す。
- **ビルドの大きさ:**
  - pdf.js のワーカーが 1.3MB、本体の JS が 750KB（gzip 後は 230KB）。
  - 必要になったら、確認画面を動的 import に分ける。
- **dev 依存の脆弱性:**
  - `npm audit` で、eslint の依存の minimatch に moderate が10件ある。
  - 本番の依存は0件。typescript-eslint の更新を待つ。
- **ブラウザ拡張でのファイル選択:**
  - Claude in Chrome の file_upload では、React の onChange に届かなかった。
  - そのため、手動確認では JS で DataTransfer を使って代わりにした。実際の利用には影響しない。
- **CI の E2E:** 動かしていない。動かすなら、`npx playwright install chrome` を足す。

## 分かったこと（次のセッションの自分へ）

- **現行版の基準出力:** `compat/out/ref` は、以前のWeb化作業で作ったものを持ってきた。作り直すには reportlab が必要で、この環境には入っていない。
- **小冊子なしのページ番号:** x 座標は、reportlab の B5（ISO、176mm）の幅をもとにしている（`NUMBER_X.single`）。
- **pdfjs-dist 6:**
  - `isEvalSupported` はなくなった。
  - 文書を捨てるときは `PDFDocumentLoadingTask.destroy()` を使う。
  - 捨てるときは `task.promise` の reject を握りつぶす（`Loading aborted`）。
- **確認画面の単位:** 小冊子の出力は「面」で数える。12ページなら6面（B4の片面1つが1面）。
