# CLAUDE.md

このプロジェクトは webapp-craft スキルの手順で開発する。

## 作業開始時に必ず

1. docs/PLAN.md の「現在地」を読む。
2. 作業対象に関係する docs/DESIGN.md の節を読む。

## コマンド

| 用途 | コマンド |
|---|---|
| 開発サーバー | `npm run dev` |
| 一括チェック | `npm run check`（型チェック・リント・単体テスト） |
| E2E | `npm run test:e2e`（本番ビルドを Chrome で操作する） |
| 現行版との一致 | `npm run compat`（`compat/out/ref` と画像で比べる） |
| デザイントークンの再生成 | `npm run tokens`（`../design-system/tokens.json` から作る） |

## 守ること

- 仕様変更は、先に docs/ を直す。
- 出力のPDFに関わる変更（`src/pdf`、`src/domain/constants.ts`、`src/domain/booklet.ts`、`src/domain/numbering.ts`）をしたら、必ず `npm run compat` を通す。
- 色や余白は `src/styles/tokens.css` の変数を使い、値を直接書かない。
- 新しいライブラリを入れたら、DESIGN.md の ADR に理由を書く。
- TypeScript は 6.x に固定する。typescript-eslint がまだ 7 に対応していないため。
