# Decision Queue

Items requiring human review, curated by AI agent sessions and the
automated tooling patrol (see hironow/dotfiles routine). Append new
entries under a dated section; tick the checkbox (or delete the entry)
once the human has decided.

Entry format:

```markdown
## YYYY-MM-DD

- [ ] **<topic>**: <decision needed> — background / options / recommendation
```

---

## Open Items

(none yet)

## 2026-06-10

- [ ] **ci-playwright-hang**: CI の「Install Playwright (chromium only)」が毎回約10分ハングして job timeout で cancelled — 背景: 2026-03-24 の green を最後に、guard 導入前の素の main（run 27247171574, 01:38 起動）でも同一ステップで再現するため takumi guard は無関係。直近の正常時は同ステップ 9 秒で完走しており、3月以降の playwright バージョン / runner イメージ / CDN いずれかの変化が疑わしい。/ 選択肢: A) playwright を最新へバンプして再検証、B) PLAYWRIGHT_DOWNLOAD_HOST 指定や verbose ログでダウンロード先を特定、C) ブラウザキャッシュ戦略の見直し / 推奨: A→B の順で安価に切り分け。guard PR #33 はこの修理後に CI 再走でマージ判断。
