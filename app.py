from flask import Flask, jsonify, request, render_template
import os
import requests
from dotenv import load_dotenv
import time
import random
import math

# ==========================================
# 数学ユーティリティ関数 (Step 4 で使用)
# ==========================================
def get_meter_constants(lat_base):
    """
    指定した基準緯度における、緯度・経度1度あたりのメートル長を返す
    """
    lat_rad = math.radians(lat_base)
    # 緯度1度あたりのメートル (約111km)
    m_per_lat = 111132.92 - 559.82 * math.cos(2 * lat_rad) + 1.175 * math.cos(4 * lat_rad)
    # 経度1度あたりのメートル (赤道から極に向かって縮む)
    m_per_lng = 111412.84 * math.cos(lat_rad) - 93.5 * math.cos(3 * lat_rad)
    return m_per_lat, m_per_lng

def latlng_to_meters(lat, lng, base_lat, base_lng):
    """
    基準点 (base_lat, base_lng) からの緯度経度の差分をメートル単位の (x, y) 座標に変換する
    x: 東西方向 (東がプラス), y: 南北方向 (北がプラス)
    """
    m_per_lat, m_per_lng = get_meter_constants(base_lat)
    dy = (lat - base_lat) * m_per_lat
    dx = (lng - base_lng) * m_per_lng
    return dx, dy

def meters_to_latlng(dx, dy, base_lat, base_lng):
    """
    メートル単位の (x, y) 座標を、基準点 (base_lat, base_lng) からの緯度経度に逆変換する
    """
    m_per_lat, m_per_lng = get_meter_constants(base_lat)
    lat = base_lat + (dy / m_per_lat)
    lng = base_lng + (dx / m_per_lng)
    return lat, lng


load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

app = Flask(__name__)

# ==========================================
# TODO (Step 1): ルートハンドラを実装してください
# ==========================================
@app.get("/")
def read_root():
    return render_template("index.html")
# ==========================================
# TODO (Step 2): 住所検索API (ジオコーディング) を実装してください
# ヒント:
# 1. requests ライブラリ（または urllib）を使って Nominatim API にリクエストを送信します。
# 2. APIのレスポンス（JSON形式のリスト）から最初の要素を取得し、緯度（'lat'）と経度（'lon'）を取り出して float 型に変換します。
# 3. 正常に取得できたら、{"success": True, "lat": lat, "lng": lng} を jsonify して返します。
# 4. 例外やエラーが発生した場合、または結果が見つからない場合は、適切なエラーメッセージとともに {"success": False, ...} を返します。
# ==========================================
@app.get("/api/geocode")
def geocode_nominatim():
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    """
    住所や目印となる建物から緯度経度を取得する関数

    呼び出し先: OpenStreetMap Nominatim API
    URL: https://nominatim.openstreetmap.org/search

    パラメータ:
    query (str): 検索したい住所や建物の名前
    format: 'json'
    email (str): 連絡先(デフォルト値は.envファイルのG_MAIL)
    delay_sec (float): リクエスト感覚(秒。デフォルト値は1.0秒)

    戻り値(JSON):
     成功時: {"success": True, "lat": 緯度(float), "lng": 経度(float)}
     失敗時: {"success": False, "message": "エラーメッセージ"}

    """

    #リクエストから検索クエリを取得
    query = request.args.get("q")
    if not query:
        return jsonify({"success": False, "message": "検索クエリが空です。"})
        
    email = os.getenv("G_MAIL")
    delay_sec = 1.0

    """
    間違い:
    def geocode_nominatim(query:str, email: str = None, delay_sec: float = 1.0): ->str
    query = request.args.get("query", "")
    if not query:
        return jsonify({"success": False, "message": "検索クエリが空です。"})
        # jsonify()でこの場合は辞書型のデータをJson形式に変換してブラウザに返すことができる
    
    メールアドレスを設定していない場合 envから取得する
    if email is None:
        email = os.getenv("G_MAIL")
        """
    
    #リクエストパラメータの設定
    params = {
        "q": query,       # 検索クエリ
        "format": "json", # 返却形式
        "limit": 1,       # 最大結果数
        "email": email    # 連絡先
    }

    # HTTPヘッダーの設定
    headers = {
        "User-Agent": f"osanpoApp-66({email})"
    }

    # APIリクエストの実行
    r = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=15)
    r.raise_for_status() #HTTPエラー（4xx, 5xx）が発生した場合にExceptionを発生させる
    
    # レスポンスの解析
    data = r.json()
    if not data:
        return jsonify({"success": False, "message": "検索結果が見つかりませんでした。"})

    # 緯度経度の取得
    lat = float(data[0]["lat"])
    lng = float(data[0]["lon"])

    #次のリクエストまでの待機(一秒ルール)
    time.sleep(delay_sec)

    return jsonify({"success": True, "lat": lat, "lng": lng})

@app.get("/api/reverse_geocode")
def reverse_geocode_nominatim():
    """
    クリックされた緯度経度から、日本語の住所を取得するAPI
    """
    NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if not lat or not lng:
        return jsonify({"success": False, "message": "緯度経度が指定されていません。"})

    email = os.getenv("G_MAIL")
    delay_sec = 1.0

    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "email": email,
        "accept-language": "ja"
    }

    headers = {
        "User-Agent": f"osanpoApp-66({email})"
    }

    try:
        r = requests.get(NOMINATIM_REVERSE_URL, params=params, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        
        address_info = data.get("address", {})
        parts = []
        if "province" in address_info:
            parts.append(address_info["province"])
        if "city" in address_info:
            parts.append(address_info["city"])
        if "suburb" in address_info:
            parts.append(address_info["suburb"])
        if "town" in address_info:
            parts.append(address_info["town"])
        if "village" in address_info:
            parts.append(address_info["village"])
        if "neighbourhood" in address_info:
            parts.append(address_info["neighbourhood"])
        if "road" in address_info:
            parts.append(address_info["road"])
            
        address_str = "".join(parts)
        
        if not address_str:
            address_str = data.get("display_name", "クリックした位置")

        time.sleep(delay_sec)
        return jsonify({"success": True, "address": address_str})
    except Exception as e:
        return jsonify({"success": False, "message": f"住所の取得に失敗しました: {str(e)}"})

# ==========================================
# TODO (Step 3): 半径400m以内の公園検索API (Overpass API) を実装してください
# ==========================================

@app.get("/api/parks")
def get_parks():
    OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
    """
    与えられた緯度経度を中心とした半径400m以内の公園や緑地を検索する関数

    パラメータ：
    ーlat 検索の中心緯度(float)
    ーlng 検索の中心経度(float)
    ーshade_mode "true"の場合、森林や樹木群を優先して検索

    戻り値：
    ー成功 jsonify({"success": True, "park": {"name": 公園名/緑地名, "lat": 緯度, "lng": 経度}})
    ー失敗 jsonify({"success": False, "message": "公園が見つかりませんでした"})
    """
    # クエリの取得とバリデーション(検証)
    lat_str = request.args.get("lat")
    lng_str = request.args.get("lng")
    shade_mode_str = request.args.get("shade_mode", "false")
    shade_mode = shade_mode_str.lower() == "true"

    if lat_str is None or lng_str is None:
        return jsonify({"success": False, "message": "緯度経度が指定されていません"})

    try:
        lat = float(lat_str)
        lng = float(lng_str)
    except ValueError:
        return jsonify({"success": False, "message": "緯度経度の形式が正しくありません。"})

    radius = 400 # 半径400m

    # Overpass QLクエリの構築
    if shade_mode:
        # 日陰モード時は森林や木々の生い茂る場所（木陰）も検索対象に含める
        overpass_query = f"""
        [out:json];
        (
          nwr(around:{radius},{lat},{lng})["leisure"="park"];
          nwr(around:{radius},{lat},{lng})["landuse"="forest"];
          nwr(around:{radius},{lat},{lng})["natural"="wood"];
          nwr(around:{radius},{lat},{lng})["leisure"="garden"];
          nwr(around:{radius},{lat},{lng})["leisure"="nature_reserve"];
        );
        out center;
        """
    else:
        # 通常時は公園のみ
        overpass_query = f"""
        [out:json];
        nwr(around:{radius},{lat},{lng})["leisure"="park"];
        out center;
        """

    # HTTPヘッダーの設定 (Python-requestsのデフォルトUAだとOverpass APIで406エラーになるため)
    email = os.getenv("G_MAIL")
    headers = {
        "User-Agent": f"osanpoApp-66({email})"
    }

    try:
        r = requests.get(OVERPASS_API_URL, params={"data": overpass_query}, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return jsonify({"success": False, "message": f"OverpassAPIへの接続に失敗しました: {str(e)}"})

    elements = data.get("elements",[])
    if not elements:
        msg = "周辺に緑地・公園が見つかりませんでした。" if shade_mode else "周辺に公園が見つかりませんでした。"
        return jsonify({"success": False, "message": msg})

    # 各要素の日陰/緑地スコアを算出する関数
    def calculate_shade_score(el):
        tags = el.get("tags", {})
        # 森林・樹木群は3点
        if tags.get("landuse") == "forest" or tags.get("natural") == "wood":
            return 3
        # 自然保護区・庭園は2点
        elif tags.get("leisure") == "nature_reserve" or tags.get("leisure") == "garden":
            return 2
        # 公園
        elif tags.get("leisure") == "park":
            # タグ内のいずれかのキーやバリューに 'wood', 'tree', 'forest' が含まれている場合は2点
            tags_str = str(tags).lower()
            if "wood" in tags_str or "tree" in tags_str or "forest" in tags_str:
                return 2
            return 1
        return 0

    # 要素にスコアを付与
    scored_elements = []
    for el in elements:
        score = calculate_shade_score(el)
        scored_elements.append((el, score))

    if shade_mode:
        # 日陰モード時は、取得できた中で最もスコアが高いグループに絞り込む
        max_score = max(score for el, score in scored_elements)
        best_elements = [el for el, score in scored_elements if score == max_score]
        selected_park, selected_score = random.choice([(el, max_score) for el in best_elements])
    else:
        # 通常時は単純にランダムに選択
        selected_park, selected_score = random.choice(scored_elements)

    # 情報を取得
    tags = selected_park.get("tags", {})
    
    # 名前の決定（名前がない場合は、スコアに応じたデフォルト名にする）
    default_name = "名もなき公園"
    if selected_score >= 3:
        default_name = "緑豊かな木立ち（森林エリア）"
    elif selected_score == 2:
        default_name = "木陰の多いエリア"
    
    park_name = tags.get("name", default_name)
    
    # 位置情報を取得(nodeとwayで異なる)
    if "center" in selected_park:
        park_lat = selected_park["center"]["lat"]
        park_lng = selected_park["center"]["lon"]
    else:
        park_lat = selected_park["lat"]
        park_lng = selected_park["lon"]
    
    return jsonify({
        "success": True,
        "park": {
            "name": park_name,
            "lat": park_lat,
            "lng": park_lng
        }
    })

@app.get("/api/calculate_waypoint")
def calculate_waypoint():
    """
    出発地、公園、希望時間から、楕円の性質を用いて第3経由地を計算する
    """
    try:
        # パラメータの取得
        start_lat = float(request.args.get("start_lat"))
        start_lng = float(request.args.get("start_lng"))
        park_lat = float(request.args.get("park_lat"))
        park_lng = float(request.args.get("park_lng"))
        duration = int(request.args.get("duration", 30))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "必要なパラメータが不足しているか、形式が正しくありません。"})

    # 犬のサイズに応じた歩行速度 (分速) を設定
    dog_size = request.args.get("dog_size", "medium")
    if dog_size == "small":
        speed = 60.0
    elif dog_size == "large":
        speed = 100.0
    else: # medium
        speed = 80.0

    # 1. 基準点(スタート)からのメートル平面座標 (x, y) に変換
    # スタート地点は (0, 0)
    px, py = latlng_to_meters(park_lat, park_lng, start_lat, start_lng)

    # 2. スタートと公園の直線距離 d_sp を計算
    d_sp = math.sqrt(px**2 + py**2)
    if d_sp < 1e-6:
        # 出発地と公園が同じ場合、適当にずらす
        return jsonify({"success": False, "message": "出発地と公園が近すぎます。"})

    # 3. 目標歩行距離 D を算出 (分速 はサイズに依存)
    D = float(duration) * speed

    # 4. 目標距離の補正 (D は 2 * d_sp より大きくないと楕円ができないため、余裕を持って 2.2倍 を下限にする)
    if D <= d_sp * 2.2:
        D = d_sp * 2.2

    # 5. 楕円のパラメータ計算
    # 焦点間の半距離 c
    c = d_sp / 2.0
    # 楕円の長半径 a (焦点からの距離の和 2a = D - d_sp)
    a = (D - d_sp) / 2.0
    # 楕円の短半径 b
    b = math.sqrt(a**2 - c**2)

    # 6. 中点 M の計算
    mx = px / 2.0
    my = py / 2.0

    # 7. S -> P 方向の単位ベクトル ex と、それに直交する単位ベクトル ey を計算
    ex_x = px / d_sp
    ex_y = py / d_sp
    # 反時計回りに90度回転した直交ベクトル (-y, x)
    ey_x = -ex_y
    ey_y = ex_x

    # 8. 短軸上の点 (0, ±b) にランダムで決定
    direction = random.choice([-1.0, 1.0])
    wx = mx + direction * b * ey_x
    wy = my + direction * b * ey_y

    # 9. メートル座標から緯度経度に逆変換
    waypoint_lat, waypoint_lng = meters_to_latlng(wx, wy, start_lat, start_lng)

    return jsonify({
        "success": True,
        "waypoint": {
            "lat": waypoint_lat,
            "lng": waypoint_lng
        }
    })

@app.get("/api/route")
def get_route():
    """
    出発地、公園、第3経由地の3点を受け取り、道路ネットワークに沿った
    ループルート(出発地 -> 公園 -> 第3経由地 -> 出発地)を OSRM API から取得して返す
    """
    try:
        start_lat = float(request.args.get("start_lat"))
        start_lng = float(request.args.get("start_lng"))
        park_lat = float(request.args.get("park_lat"))
        park_lng = float(request.args.get("park_lng"))
        waypoint_lat = float(request.args.get("waypoint_lat"))
        waypoint_lng = float(request.args.get("waypoint_lng"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "必要なパラメータが不足しているか、形式が正しくありません。"})

    # OSRM API は「経度,緯度」の順で座標を組み立てる
    # ループさせるために: スタート -> 公園 -> 第3経由地 -> スタート の順にする
    coordinates = f"{start_lng},{start_lat};{park_lng},{park_lat};{waypoint_lng},{waypoint_lat};{start_lng},{start_lat}"
    
    # SSLハンドシェイクエラー（LibreSSL等の古いSSLモジュールとの互換性問題）を回避するため http を使用
    OSRM_URL = f"http://router.project-osrm.org/route/v1/foot/{coordinates}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true"
    }

    # HTTPヘッダーの設定 (OSRMにもUAを付与するのがマナー)
    email = os.getenv("G_MAIL")
    headers = {
        "User-Agent": f"osanpoApp-66({email})"
    }

    try:
        r = requests.get(OSRM_URL, params=params, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return jsonify({"success": False, "message": f"OSRM APIへの接続に失敗しました: {str(e)}"})

    if "routes" not in data or not data["routes"]:
        return jsonify({"success": False, "message": "経路が見つかりませんでした。"})

    route = data["routes"][0]
    
    # 経路情報 (GeoJSON)、総距離 (m)、総時間 (秒)、道案内情報を返却
    return jsonify({
        "success": True,
        "geometry": route.get("geometry"),
        "distance": route.get("distance"),
        "duration": route.get("duration"),
        "legs": route.get("legs", [])
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)