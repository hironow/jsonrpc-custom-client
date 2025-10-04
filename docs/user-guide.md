# JSONRPC WebSocket クライアント 使い方ガイド

このドキュメントは、アプリの画面操作で JSON‑RPC 2.0 over WebSocket を扱うための実用的な使い方をまとめたものです。開発者向けの詳細仕様やテストについてはリポジトリの README を参照してください。

---

## 1. 起動手順

- 依存関係をインストール
  - `pnpm install`
- 開発サーバ起動
  - `pnpm dev` → ブラウザで `http://localhost:3000` を開きます
- 既定の WebSocket URL
  - 環境変数 `NEXT_PUBLIC_WS_URL_DEFAULT` を設定すると初期値になります（未設定時は `ws://localhost:8080`）。

---

## 2. 接続（Connection パネル）

- Dummy Mode（ダミーモード）
  - ON にすると、バックエンド不要で擬似ストリームを生成します。
  - Connect/Disconnect で開始・停止。URL フィールドは Dummy Mode 中は無効化されます。
- 実サーバ接続
  - Dummy Mode を OFF にし、WebSocket URL を入力して Connect をクリックします。
  - 接続状態はバッジ（Disconnected / Connecting / Connected / Error）で表示されます。

---

## 3. リクエスト送信（Request フォーム）

- 単発送信
  - `Method` にメソッド名（例: `user.get`）を入力。
  - `Parameters (JSON)` に JSON を入力。`Format` で整形できます。
  - `Send Request` で送信（JSON は Zod バリデーション済み。形式エラーは画面に表示）。
- バッチ送信
  - `Batch Mode` を ON にし、`Add Request` で項目を追加。
  - 各行で `Method` と `Params(JSON)` を入力。
  - `Send Batch` でまとめて送信。

---

## 4. メッセージ一覧（Messages）

- ヘッダの操作
  - `Auto` … 自動スクロールの ON/OFF
  - `Export` … 表示中のメッセージを JSON ダウンロード
  - `Clear` … すべてのメッセージをクリア
- 種別タブ
  - `All / Sent / Recv / Notif / Err` の各タブで絞り込み。バッジの件数は「現在の表示（クイックフィルタ適用後）」を反映します。
- 時間ヘッダ
  - 一覧は経過時間でグループ化され、スクロール時に現在位置の経過時間をオーバーレイ表示します。

### クイックフィルタ（簡易プリセット）

- `Method:user` … メソッド名に `user` を含むもの
- `ID:1` … JSON‑RPC の `id`（単発/バッチ内/Message.requestId を含む）に一致
- `Text:error` … ペイロード JSON の文字列中に `error` を含むもの
- `Reset Preset` … プリセットの解除

> Export は「現在の表示（クイックフィルタ適用後）」のみを出力します。ファイル名にはフィルタ内容が反映されます（例: `messages-filtered-method-user-YYYY...json`）。

---

## 5. 右ペイン（Details / Notifications）

- Details（詳細）
  - メッセージをクリックすると詳細を表示。JSON はハイライト/エスケープ済みで安全に表示されます。
  - リクエストとレスポンスは矢印とラインで連結表示され、往復の関連が分かります。
  - バッチはリクエスト/レスポンスのペアを整列して確認できます。
  - スペック検証（JSON‑RPC 2.0）のエラー/警告はバッジ/リストで表示されます。
- Notifications（通知）
  - 通知（`isNotification`）のみを一覧表示。項目を選ぶと Details タブで内容を確認できます。

---

## 6. パフォーマンス（Performance タブ）

- Message Buffer Limit
  - 表示用リングバッファの上限。小さくすると即時トリムされます。
  - 既定は環境変数 `NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT`（未指定時は 2000）。
- Buffer Trim Strategy
  - `Prefer Pending` … 進行中メッセージを優先的に残す
  - `Prefer Batches` … バッチを優先的に残す
  - `Drop Chunk Size` … 強制ドロップの塊サイズ（過剰時の前方削除）
- Row Height Estimate
  - `Heuristic` と `Fixed (88px)` を切替。大きなペイロードやバッチではヒューリスティックが有効です。

---

## 7. 自動再接続（Reconnect）

- 接続が切れた場合は指数バックオフで再接続を試みます（上限/ジッタあり）。
- 接続成功で試行回数はリセット。`Disconnect` をクリックすると予約済み再接続はキャンセルされます。

---

## 8. Dummy Mode の活用

- バックエンドがなくても UI の一通りの機能を検証できます（送受信/バッチ/通知/リンク表示など）。
- 開発者向け（任意）
  - フックにオプションを渡すと挙動を決定的にできます：
    - `rng: () => number`（分岐用乱数の差し替え）
    - `dummy.autoRequestIntervalMs / dummy.notificationIntervalMs`（擬似イベント間隔の変更）

---

## 9. トラブルシュート

- 接続できない / すぐ切断される
  - URL の誤り、CORS/CSP、プロキシ/ファイアウォールを確認してください。
- JSON が送れない / エラー表示になる
  - `Parameters (JSON)` は「配列」か「オブジェクト」である必要があります。`Format` で整形するとエラーに気付きやすくなります。
- 画面が重い
  - `Performance → Message Buffer Limit` を下げる、または `Prefer Pending/Batches` と `Drop Chunk Size` を調整してください。

---

## 10. よくある質問（FAQ）

- Q. Export は何を含みますか？
  - A. 現在の表示（クイックフィルタ適用後）だけを含みます。タイムスタンプは ISO 文字列で保存され、インポートで Date に復元可能です。
- Q. 既定の接続先を変更できますか？
  - A. 環境変数 `NEXT_PUBLIC_WS_URL_DEFAULT` を設定してください。
- Q. バリデーションの基準は？
  - A. JSON‑RPC 2.0 の仕様に準拠しています。レスポンスの `error.code` は整数必須、予約コードは警告として扱います。

---

以上です。まずは Dummy Mode でつなぎ、単発→バッチ→フィルタ→エクスポート→詳細/リンクの一連の流れを試してみてください。
