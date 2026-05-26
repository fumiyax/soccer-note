# サッカー観察ノート (Soccer Observation Notes)

## 概要
子供のサッカーの試合・練習で気づいたことを記録し、テーマ別に振り返れるWebアプリ。
Google Sheets をバックエンドに使用し、GitHub Pages でデプロイする単一HTML SPA。

## 開発ルール

### バージョン管理
- index.html を修正するたびにバージョン番号を1つ上げること

### デプロイ
- GitHub Pages（mainブランチ直push）
- GASバックエンド: `clasp push` でデプロイ

### バックアップ
- index.html を修正する前にバックアップを取ること
- 保存先: `backup/`
- 命名規則: `index_ver{番号}_{変更内容の短い説明}.html`

## 技術仕様

### アーキテクチャ
- 単一HTML SPA（Vanilla JS、フレームワークなし）
- Google Apps Script（GAS）をAPIバックエンドとして使用
- Google Sheets をデータストアとして使用
- localStorage キャッシュ → GAS 非同期更新（オプティミスティック更新）

### Google Sheets スキーマ
- **entries**: id, date, title, type, note, createdAt
- **items**: id, entryId, text, tag, theme, sortOrder
- **themes**: id, name, icon, sortOrder

### GAS API
- POST リクエスト → JSON レスポンス
- actions: getAll, saveEntry, deleteEntry, saveItem, deleteItem, saveTheme, bulkSaveEntry
