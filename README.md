# SNS Content Autopilot

AI-powered social media content planning and scheduling tool for Instagram, Threads, and Note.

## 概要

SNS Content Autopilotは、Instagram、Threads、Noteの投稿を一元管理し、AI（OpenAI GPT-4）で高品質なコンテンツアイデアと投稿ドラフトを自動生成するSaaSツールです。

### 主な機能

- **AIコンテンツ生成**: テーマを入力するだけで、複数のコンテンツアイデアと投稿ドラフトを自動生成
- **投稿カレンダー**: 月次ビューで投稿スケジュールを視覚的に管理
- **マルチプラットフォーム対応**: Instagram、Threads、Note向けに最適化されたコンテンツを生成
- **ブランドトーン管理**: プラットフォームごとにブランドの声やスタイルをカスタマイズ
- **自動投稿スケジューラー**: 予約投稿の自動実行（Cron対応）
- **パフォーマンス分析**: エンゲージメント、リーチ、インプレッションなどの指標を可視化

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL + Prisma ORM
- **AI**: OpenAI API (GPT-4)
- **チャート**: Recharts
- **日付処理**: date-fns

## セットアップ

### 前提条件

- Node.js 18+
- PostgreSQL 14+
- OpenAI APIキー

### インストール

1. リポジトリをクローン:

```bash
git clone https://github.com/yourusername/sns-content-autopilot.git
cd sns-content-autopilot
```

2. 依存関係をインストール:

```bash
npm install
```

3. 環境変数を設定:

```bash
cp .env.example .env
```

`.env`ファイルを編集して以下を設定:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sns_autopilot?schema=public"
OPENAI_API_KEY="sk-..."
ENCRYPTION_KEY="your-32-character-encryption-key-here"
NODE_ENV="development"
```

4. データベースをセットアップ:

```bash
npm run db:push
npm run db:seed
```

5. 開発サーバーを起動:

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 使い方

### 1. ブランドアカウントの登録

初回は`npm run db:seed`でサンプルアカウントが作成されます。実際の使用では、各プラットフォームのアクセストークンを登録します。

```typescript
// ブランドアカウントの例
{
  platform: "INSTAGRAM",
  handle: "@my_lifestyle_brand",
  accessToken: "encrypted_token",
  toneProfile: {
    voice: "friendly",
    style: "inspirational",
    emojis: true,
    hashtagCount: 15,
    targetAudience: "lifestyle enthusiasts aged 25-35"
  }
}
```

### 2. コンテンツアイデアの生成

1. **Ideas**ページへ移動
2. **Generate Ideas**をクリック
3. 以下を入力:
   - ブランドアカウント
   - テーマ（例: "朝のルーティンで生産性向上"）
   - ターゲット日付
   - 生成する数（1-10）

AIが自動的に以下を生成:
- 洗練されたテーマ
- 注目を集めるフック（冒頭文）
- 詳細なアウトライン

### 3. 投稿ドラフトの作成

1. アイデア一覧から**Generate Draft**をクリック
2. AIが以下を自動生成:
   - プラットフォームに最適化されたキャプション
   - 戦略的なハッシュタグ
   - メディアプラン（画像/動画の提案）

### 4. ドラフトの編集と予約

1. **Drafts**ページで生成されたドラフトを確認
2. 必要に応じてキャプションを編集
3. 投稿日時を設定
4. **Schedule Post**で予約完了

### 5. 自動投稿

Workerを定期実行して予約投稿を自動公開:

```bash
# 手動実行
npm run worker

# Cronで5分ごとに実行（本番環境）
*/5 * * * * cd /path/to/sns-content-autopilot && npm run worker
```

### 6. パフォーマンス分析

**Analytics**ページで以下を確認:
- 総投稿数、いいね数、リーチ数
- 時系列のエンゲージメント推移
- プラットフォーム別パフォーマンス
- トップパフォーマンス投稿

## ユースケース例：ライフスタイルブランドの場合

### ブランド戦略

**ターゲット**: 25-35歳の都市部に住む女性、キャリアとウェルネスの両立に関心
**ブランドボイス**: フレンドリーで励ましの雰囲気、共感を重視

### プラットフォーム別戦略

#### Instagram (@my_lifestyle_brand)
- **投稿頻度**: 週3-5回
- **コンテンツタイプ**: カルーセル投稿中心、Before/After、Tipsリスト
- **トーン**: インスピレーショナル、ビジュアル重視
- **ハッシュタグ**: 15個（ブランド、コミュニティ、トレンド混合）

**テーマ例**:
- 朝のルーティンで1日を最適化
- 忙しい人のための5分セルフケア
- サステナブルな暮らしのヒント

#### Threads (@my_lifestyle_brand_threads)
- **投稿頻度**: 毎日
- **コンテンツタイプ**: 短いTips、質問投稿、コミュニティとの対話
- **トーン**: カジュアル、会話的
- **ハッシュタグ**: 控えめ（3-5個）

**テーマ例**:
- 今朝の発見シェア
- フォロワーへの質問
- トレンドへのリアクション

#### Note (my_lifestyle_brand_note)
- **投稿頻度**: 週1-2回
- **コンテンツタイプ**: 長文ストーリー、詳細ガイド、体験談
- **トーン**: プロフェッショナルかつパーソナル
- **ハッシュタグ**: ほぼなし

**テーマ例**:
- キャリア転換の全記録
- 30日チャレンジの振り返り
- 専門家インタビュー

### 実際のワークフロー

```
月曜日:
1. 週のテーマを決定（例: "生産性向上"）
2. AIで3つのアイデアを生成
3. 最も良いアイデアを選んでApprove

火曜日:
1. 承認したアイデアからInstagram用ドラフトを生成
2. 画像プランに基づいてCanvaで画像作成
3. キャプションを微調整
4. 木曜朝9:00に予約

水曜日:
1. 同じアイデアをThreads版に変換（短く、会話的に）
2. 木曜昼12:00に予約

木曜日:
- 自動投稿される（Workerが実行）

金曜日:
- Analyticsページでエンゲージメント確認
- 好調な投稿のテーマを次週に活用
```

## アーキテクチャ

### データモデル

```
BrandAccount (ブランドアカウント)
├── platform: Instagram | Threads | Note
├── handle: @username
├── accessToken: 暗号化されたアクセストークン
└── toneProfile: ブランドの声とスタイル設定

ContentIdea (コンテンツアイデア)
├── theme: テーマ
├── hook: フック（冒頭文）
├── outline: アウトライン
└── status: Draft | Approved | Used | Archived

PostDraft (投稿ドラフト)
├── caption: キャプション
├── hashtags: ハッシュタグ配列
├── mediaPlan: メディアプラン（JSON）
├── scheduledAt: 予約日時
├── status: Draft | Scheduled | Published | Failed
└── resultStats: パフォーマンス指標（JSON）
```

### SNSクライアントの拡張

現在はダミー実装ですが、実際のSNS APIに簡単に置き換えられる設計:

```typescript
// src/lib/sns-clients/instagram.ts
export class InstagramClient extends BaseSNSClient {
  async publish(caption: string, mediaUrls: string[]): Promise<PostResult> {
    // TODO: Instagram Graph API統合
    // const response = await fetch('https://graph.instagram.com/...')
    // ...
  }
}
```

実装時の参考:
- **Instagram**: [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- **Threads**: [Threads API](https://developers.facebook.com/docs/threads) (2024年に公開予定)
- **Note**: [Note API](https://note.com/api) (公式APIドキュメント)

## 開発

### データベーススキーマの変更

```bash
# スキーマ変更後
npm run db:push

# マイグレーション生成（本番環境向け）
npm run db:migrate
```

### Prisma Studio

データベースをGUIで確認:

```bash
npm run db:studio
```

### ディレクトリ構造

```
sns-content-autopilot/
├── prisma/
│   ├── schema.prisma          # データベーススキーマ
│   └── seed.ts                # シードデータ
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── calendar/          # カレンダーページ
│   │   ├── ideas/             # アイデア管理
│   │   ├── drafts/            # ドラフト管理
│   │   └── analytics/         # 分析ダッシュボード
│   ├── components/            # 共通コンポーネント
│   ├── lib/
│   │   ├── db.ts              # Prismaクライアント
│   │   ├── encryption.ts      # トークン暗号化
│   │   ├── llm.ts             # OpenAI統合
│   │   └── sns-clients/       # SNSクライアント
│   └── workers/
│       └── post-scheduler.ts  # 投稿スケジューラー
└── package.json
```

## デプロイ

### Vercel（推奨）

```bash
vercel
```

環境変数を設定:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY`

### Workerのセットアップ

VercelではCronジョブが使えないため、以下の方法を推奨:

1. **Vercel Cron Jobs** (Proプラン)
2. **外部Cronサービス** (Cron-job.org、EasyCron等)
   - エンドポイント: `https://your-app.vercel.app/api/cron/publish`
   - 頻度: 5分ごと

3. **別サーバーでWorker実行** (AWS Lambda、Railway等)

## ロードマップ

- [ ] 実際のInstagram Graph API統合
- [ ] Threads API統合（公開され次第）
- [ ] Note API統合
- [ ] 画像自動生成（DALL-E / Midjourney連携）
- [ ] A/Bテスト機能
- [ ] ハッシュタグ推薦AI
- [ ] 最適投稿時間の推薦
- [ ] チームコラボレーション機能
- [ ] マルチアカウント管理
- [ ] Instagramストーリーズ対応
- [ ] リール動画の自動生成案

## ライセンス

MIT

## 貢献

プルリクエスト歓迎です！

## サポート

問題が発生した場合は、[Issues](https://github.com/yourusername/sns-content-autopilot/issues)を開いてください。
