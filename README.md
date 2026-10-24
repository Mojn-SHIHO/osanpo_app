# 🐾 お散歩ナビ (Dog Walking Course Generator)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-API-7EBC6F.svg?logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)

> **一言で説明**: 愛犬のサイズや希望のお散歩時間、日陰の好みに合わせて、周辺の公園を経由する最適な「周回お散歩コース」を幾何学アルゴリズムで自動生成するWebアプリケーション。

<!-- スクリーンショットやデモGIFを追加する場合は以下のパスに画像を配置してください -->
<!-- ![お散歩ナビのデモ画面](docs/images/demo.png) -->

---

## 📖 概要

「愛犬との毎日のお散歩がいつも同じルートになって飽きてしまう」「暑い日には木陰の多い涼しいコースを歩かせたい」「愛犬の体力や体格に合わせてちょうど良い時間で一周して帰ってきたい」という課題を解決するために開発したWebアプリケーションです。

出発地（または現在地）と希望の散歩時間、犬のサイズ（小型・中型・大型）、日陰モードの有無を選択するだけで、周辺の公園や緑地を巡る最適なループコースを自動で探索・設計します。

### なぜ作ったのか（モチベーション）

- **散歩ルートのマンネリ化解消**: 毎日同じ道ばかりになりがちな散歩コースに、手軽に新しい発見を取り入れたかった。
- **愛犬の健康と熱中症対策**: 夏場のアスファルトの照り返しや直射日光を避けるため、木立や森林エリア（日陰）を優先的に通るコースを選べるようにしたかった。
- **体格に応じた適切な運動量の確保**: 小型犬と大型犬では歩くペースや適切な距離が異なるため、時間とサイズに応じた最適な周回距離を自動計算したかった。
- **外部Web APIと数学的アルゴリズムの実践**: OpenStreetMapのエコシステム（Nominatim, Overpass API, OSRM）と幾何学計算（楕円軌道）を組み合わせた実践的なフルスタックWeb開発を学びたかった。

---

## ✨ 主な機能

- 📍 **住所検索 & 地図クリックによる位置指定**:
  - OpenStreetMap Nominatim API を利用したフリーワード住所・施設名検索
  - 地図上の自由なクリックによる出発地の指定（逆ジオコーディングで住所も自動取得）
- 🌳 **周辺公園・緑地スポットの自動探索 (Overpass API)**:
  - 出発地から半径400m以内の公園や緑地を自動スキャン
- 🌿 **日陰・木陰優先モード**:
  - 森林、樹木群、自然保護区、庭園などを独自スコアリングし、木陰の多い涼しいエリアを優先的に経由
- 🐕 **ワンちゃんのサイズ別歩行計算**:
  - 小型犬（分速60m）、中型犬（分速80m）、大型犬（分速100m）の歩行速度に応じた距離を自動算出
- 📐 **楕円の幾何学性質を活用したループ地点計算**:
  - 「出発地」と「公園」の2点を焦点とした楕円軌道から、希望時間にぴったりの第3経由地（Waypoint）を幾何学的に算出
- 🗺️ **実道路ネットワークに沿った歩行者ルート案内 (OSRM)**:
  - 出発地 → 公園 → 第3経由地 → 出発地 を結ぶ安全な周回ループルート（総距離・所要時間・ターンバイターンの道案内）を描画

---

## 🛠 技術スタック

| カテゴリ | 技術 |
|:--|:--|
| **フロントエンド** | HTML5 / CSS3 (CSS Variables, レスポンシブ設計) / Vanilla JavaScript |
| **地図描画** | Leaflet.js / OpenStreetMap Tiles / FontAwesome |
| **バックエンド** | Python 3 / Flask / Gunicorn (本番WSGIサーバー) |
| **外部API** | • **Nominatim API** (ジオコーディング・住所逆引き)<br>• **Overpass API** (OpenStreetMapデータ・公園/森林検索)<br>• **OSRM (Open Source Routing Machine)** (歩行者ルート探索) |
| **数学・アルゴリズム** | 測地線平面直角座標変換 (Vincenty/近似計算)、楕円幾何学アルゴリズム |
| **開発環境** | VS Code / Git / GitHub |

---

## 🏗 アーキテクチャ

```text
[ ブラウザ (Client) ]
    │  ▲
    │  │ Leaflet.js による地図表示 & ルート描画 (GeoJSON)
    ▼  │
[ Flask サーバー (Python Backend) ]
    ├── 1. 住所検索 / 逆ジオコーディング
    │       └── Nominatim API (OpenStreetMap)
    ├── 2. 半径400m 公園・木陰探索 & スコアリング
    │       └── Overpass API (OSMデータ)
    ├── 3. 目標歩行距離 & 第3経由地算出
    │       └── 幾何学アルゴリズム (楕円の短軸上の点)
    └── 4. 実道路歩行ルート生成
            └── OSRM API (Foot Routing)
```

---

## 🚀 はじめ方

### 前提条件

- Python 3.10 以上
- Git

### セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/Mojn-SHIHO/osanpo_app.git
cd osanpo_app

# 2. Python仮想環境を作成して有効化
python -m venv venv

# macOS / Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 3. 必要なライブラリをインストール
pip install -r requirements.txt

# 4. 環境変数の設定
cp .env.example .env
# .env を開き、必要に応じて G_MAIL (OpenStreetMap API利用ポリシー用のメールアドレス) を入力してください

# 5. アプリケーションを起動
python app.py
```

ブラウザで `http://127.0.0.1:5000` にアクセスすると、アプリが利用できます。

---

## 📝 使い方

1. **出発地を入力**: 検索ボックスに駅名や住所を入力するか、地図上を直接クリックして出発地を指定します。
2. **条件を設定**:
   - スライダーで「希望の散歩時間（10分〜90分）」を選択
   - ワンちゃんのサイズ（小型犬・中型犬・大型犬）を選択
   - 暑い日や日差しが強い日は「🌿 日陰モード」をON
3. **「コースを生成する」ボタンをクリック**:
   - 周辺の公園・緑地を経由してスタート地点へ戻る周回ルートが地図上に描画されます。
   - コースの総距離、推定所要時間、経由する公園名、詳細な道案内リストが表示されます。

---

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。
