// Global Map Variables
let map;                 // 地図の本体オブジェクトを格納する変数
let startMarker = null;  // 出発地のピン（マーカー）オブジェクトを格納する変数
let parkMarker = null;   // 経由地となる公園のピンオブジェクトを格納する変数
let waypointMarker = null; // ループを作るための第3経由地のピンオブジェクトを格納する変数
let routePolyline = null; // 地図上に描画されるルートの「線（ポリライン）」を格納する変数

// Selected Coordinates & Data
let startCoords = { lat: 36.3534, lng: 139.7118 }; // Default: Shin-Ohairashita Station
let selectedPark = null;
let thirdWaypoint = null;

// DOM Elements
const startInput = document.getElementById('startInput');
const durationInput = document.getElementById('durationInput');
const durationVal = document.getElementById('durationVal');
const generateBtn = document.getElementById('generateBtn');
const dashboardPanel = document.getElementById('dashboardPanel');
const loadingOverlay = document.getElementById('loadingOverlay');
const directionsHeader = document.getElementById('directionsHeader');
const directionsContent = document.getElementById('directionsContent');
const directionsChevron = document.getElementById('directionsChevron');
const stepsList = document.getElementById('stepsList');
const parkNameSpan = document.getElementById('parkName');
const rerollParkBtn = document.getElementById('rerollParkBtn');
const dogSizeInput = document.getElementById('dogSizeInput');
const shadeModeInput = document.getElementById('shadeModeInput');

// Initialize Application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();             // 1. 地図を初期表示する
    initEventListeners();  // 2. ボタンやスライダーの操作を待ち受ける状態にする
});

// =========================================================================
// TODO (Step 1): 地図 (Leaflet) の初期化とタイルレイヤーの設定を行ってください
// =========================================================================
// 目的: map 変数に Leaflet のマップインスタンスを設定し、OpenStreetMapの地図タイルを表示します。
// 手順:
// 1. L.map('map') を使用してマップオブジェクトを作成し、map 変数に代入します。
// 2. 地図の初期表示位置として、デフォルト座標 startCoords.lat, startCoords.lng を設定し、ズームレベルを 15 に指定します (.setView)
// 3. L.tileLayer を使用して OpenStreetMap のタイルレイヤーを作成し、地図に追加します (.addTo(map))。
//    OpenStreetMap タイルURLの例: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
//    アトリビューション(著作権表記): '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
function initMap() {
    // 💡 ここにあなたのコードを記述してください (Step 1)
    // L.map関数で初期化し、初期座標(新大平下駅)とズームレベル(15)を設定
    map = L.map("map").setView([startCoords.lat, startCoords.lng], 15);
    // OpenStreetMapのタイルレイヤーを作成し、地図に追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 地図をクリックした時のイベントを設定
    map.on('click', async (e) => {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;
        
        showLoading(true);
        
        try {
            const response = await fetch(`/api/reverse_geocode?lat=${clickedLat}&lng=${clickedLng}`);
            const data = await response.json();
            
            if (data.success) {
                // 入力欄に住所をセット
                startInput.value = data.address;
                
                // 出発地座標の更新
                startCoords.lat = clickedLat;
                startCoords.lng = clickedLng;
                
                // 出発地マーカーの設定または更新
                if (startMarker) {
                    startMarker.setLatLng([clickedLat, clickedLng]);
                } else {
                    startMarker = L.marker([clickedLat, clickedLng]).addTo(map);
                }
                startMarker.bindPopup(`出発地: ${data.address}`).openPopup();
                
                // 近くの公園を自動検索
                await fetchNearbyPark(clickedLat, clickedLng);
            } else {
                alert(data.message || "住所の取得に失敗しました。");
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            alert("住所の取得中に通信エラーが発生しました。");
        } finally {
            showLoading(false);
        }
    });
}

// Set up UI Event Listeners
function initEventListeners() {
    // 1. Duration Slider update display
    durationInput.addEventListener('input', (e) => {
        durationVal.textContent = e.target.value;
    });

    // 2. Collapsible Directions
    directionsHeader.addEventListener('click', () => {
        directionsContent.classList.toggle('open');
        directionsChevron.classList.toggle('fa-chevron-down');
        directionsChevron.classList.toggle('fa-chevron-up');
    });

    // 3. Generate Route Click
    generateBtn.addEventListener('click', () => {
        generateWalkRoute();
    });

    // 4. Address Input Search (Enter Key)
    startInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            executeGeocoding();
        }
    });

    // 5. Reroll Park Click
    rerollParkBtn.addEventListener('click', () => {
        fetchNearbyPark(startCoords.lat, startCoords.lng, true);
    });
}

// Show/Hide Loading overlay
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Placeholder functions for future steps
async function executeGeocoding() {
    const query = startInput.value.trim();
    if (!query) {
        alert("出発地を入力してください。");
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            startCoords.lat = data.lat;
            startCoords.lng = data.lng;

            // 出発地マーカーの設定
            if (startMarker) {
                startMarker.setLatLng([startCoords.lat, startCoords.lng]);
            } else {
                startMarker = L.marker([startCoords.lat, startCoords.lng]).addTo(map);
            }
            startMarker.bindPopup(`出発地: ${query}`).openPopup();
            map.setView([startCoords.lat, startCoords.lng], 15);

            console.log("Geocoding successful. Coordinates:", startCoords);
            
            // 近くの公園の検索も連動して呼び出す（Step 3で実装）
            await fetchNearbyPark(startCoords.lat, startCoords.lng);
        } else {
            alert(data.message || "位置情報が見つかりませんでした。");
        }
    } catch (error) {
        console.error("Geocoding error:", error);
        alert("通信エラーが発生しました。");
    } finally {
        showLoading(false);
    }
}

async function fetchNearbyPark(lat, lng, isReroll = false) {
    console.log(`Fetching parks around: ${lat}, ${lng}`);
    
    // ローディング表示を開始
    showLoading(true);
    
    try {
        const isShade = shadeModeInput.checked;
        const response = await fetch(`/api/parks?lat=${lat}&lng=${lng}&shade_mode=${isShade}`);
        const data = await response.json();
        
        if (data.success) {
            selectedPark = data.park; // { name, lat, lng }
            
            // HTML上の公園名表示を更新
            parkNameSpan.textContent = selectedPark.name;
            
            // 公園マーカーの作成または更新 (日陰モードなら🌲、通常なら🌳を使用)
            const parkEmoji = isShade ? '🌲' : '🌳';
            const parkIcon = L.divIcon({
                html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">${parkEmoji}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -10]
            });
            
            if (parkMarker) {
                parkMarker.setLatLng([selectedPark.lat, selectedPark.lng]);
            } else {
                parkMarker = L.marker([selectedPark.lat, selectedPark.lng], { icon: parkIcon }).addTo(map);
            }
            
            // ポップアップの設定とオープン
            parkMarker.bindPopup(`経由地（公園）: <strong>${selectedPark.name}</strong>`).openPopup();
            
            // 地図の表示範囲を、出発地と公園の両方が収まるように自動調整
            if (startMarker && parkMarker) {
                const group = new L.featureGroup([startMarker, parkMarker]);
                map.fitBounds(group.getBounds().pad(0.25));
            } else {
                map.setView([selectedPark.lat, selectedPark.lng], 15);
            }
            
            console.log("Park fetch successful. Selected park:", selectedPark);
        } else {
            alert(data.message || "近くに公園が見つかりませんでした。");
            parkNameSpan.textContent = "公園が見つかりませんでした";
        }
    } catch (error) {
        console.error("Error fetching park:", error);
        alert("公園の取得中に通信エラーが発生しました。");
        parkNameSpan.textContent = "エラーが発生しました";
    } finally {
        // ローディング表示を終了
        showLoading(false);
    }
}

async function generateWalkRoute() {
    console.log("Generating walk route...");
    
    // 1. バリデーションチェック
    if (!startCoords || !selectedPark) {
        alert("出発地の検索、または経由する公園の決定が完了していません。先に住所を入力して検索してください。");
        return;
    }

    const duration = parseInt(durationInput.value, 10);
    
    // ローディングを表示
    showLoading(true);

    try {
        // 2. /api/calculate_waypoint を呼び出して第3の経由地を幾何計算
        const params = new URLSearchParams({
            start_lat: startCoords.lat,
            start_lng: startCoords.lng,
            park_lat: selectedPark.lat,
            park_lng: selectedPark.lng,
            duration: duration,
            dog_size: dogSizeInput.value
        });

        const response = await fetch(`/api/calculate_waypoint?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            thirdWaypoint = data.waypoint; // { lat, lng }

            // 3. 第3の経由地マーカーを表示 (🚩の絵文字を使用)
            const waypointIcon = L.divIcon({
                html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">🚩</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -10]
            });

            if (waypointMarker) {
                waypointMarker.setLatLng([thirdWaypoint.lat, thirdWaypoint.lng]);
            } else {
                waypointMarker = L.marker([thirdWaypoint.lat, thirdWaypoint.lng], { icon: waypointIcon }).addTo(map);
            }

            waypointMarker.bindPopup("経由地（ループ形成用）").openPopup();

            console.log("Waypoint calculated successfully:", thirdWaypoint);
            
            // 4. バックエンドの /api/route API を呼び出して道路沿いのルートを取得
            const routeParams = new URLSearchParams({
                start_lat: startCoords.lat,
                start_lng: startCoords.lng,
                park_lat: selectedPark.lat,
                park_lng: selectedPark.lng,
                waypoint_lat: thirdWaypoint.lat,
                waypoint_lng: thirdWaypoint.lng
            });

            const routeResponse = await fetch(`/api/route?${routeParams.toString()}`);
            const routeData = await routeResponse.json();

            if (routeData.success) {
                // 地図上にルートラインを描画
                drawRoute(routeData.geometry);

                // ダッシュボードのメトリクスを更新
                updateDashboardMetrics(routeData.distance, routeData.duration);

                // 日本語の道案内表示を更新
                updateNavigationDirections(routeData.legs);

                // ダッシュボードを表示
                dashboardPanel.classList.add('active');

                // 全体が入るように地図をフィット
                if (routePolyline) {
                    map.fitBounds(routePolyline.getBounds().pad(0.15));
                }
            } else {
                alert(routeData.message || "徒歩ルートの取得に失敗しました。");
            }
            
        } else {
            alert(data.message || "幾何計算に失敗しました。");
        }
    } catch (error) {
        console.error("Error generating route:", error);
        alert("ルート生成中にエラーが発生しました。");
    } finally {
        showLoading(false);
    }
}

// 🌐 地図上に緑色の太いルートラインを描画する
function drawRoute(geometry) {
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    
    // 日陰モードなら濃い深緑、通常ならフォレストグリーン
    const routeColor = shadeModeInput.checked ? '#1e3f20' : '#2d5a27';
    
    routePolyline = L.geoJSON(geometry, {
        style: {
            color: routeColor,      // 動的に決定した色
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }
    }).addTo(map);
}

// 📊 ダッシュボードのメトリクス（距離・時間・カロリー）を更新する
function updateDashboardMetrics(distanceMeters, durationSeconds) {
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    const durationMinutes = Math.round(durationSeconds / 60);

    // 犬のサイズに応じた想定体重 (kg) の決定
    let dogWeight = 15; // デフォルト (medium)
    const dogSize = dogSizeInput.value;
    if (dogSize === 'small') {
        dogWeight = 5;
    } else if (dogSize === 'large') {
        dogWeight = 30;
    }

    // 消費カロリー計算 (人間: 体重60kg想定 / 犬: 想定体重)
    const humanCalories = Math.round(distanceKm * 60);
    const dogCalories = Math.round(distanceKm * dogWeight * 0.7);

    document.getElementById('routeDistance').textContent = distanceKm;
    document.getElementById('routeDuration').textContent = durationMinutes;
    document.getElementById('humanCalories').textContent = humanCalories;
    document.getElementById('dogCalories').textContent = dogCalories;
}

// 🔤 OSRMの英語案内を簡易的に日本語に変換する
function translateManeuver(step) {
    const type = step.maneuver.type;
    const modifier = step.maneuver.modifier;
    const streetName = step.name || "";
    const distance = Math.round(step.distance);

    let instruction = "";
    const streetInfo = streetName ? `「${streetName}」` : "道";

    switch (type) {
        case "depart":
            instruction = `出発地から${streetInfo}に入ります`;
            break;
        case "arrive":
            instruction = "目的地に到着します";
            break;
        case "turn":
            if (modifier.includes("left")) {
                instruction = `${streetInfo}を左折します`;
            } else if (modifier.includes("right")) {
                instruction = `${streetInfo}を右折します`;
            } else {
                instruction = `${streetInfo}を曲がります`;
            }
            break;
        case "new name":
            instruction = `${streetInfo}を進みます`;
            break;
        case "fork":
            instruction = `分岐を ${modifier === "left" ? "左" : "右"} に進みます`;
            break;
        case "roundabout":
            instruction = "ラウンドアバウトに入ります";
            break;
        case "continue":
            instruction = `そのまま直進し、${streetInfo}を進みます`;
            break;
        default:
            if (modifier === "left") {
                instruction = `${streetInfo}を左に進みます`;
            } else if (modifier === "right") {
                instruction = `${streetInfo}を右に進みます`;
            } else {
                instruction = `${streetInfo}を進みます`;
            }
            break;
    }

    if (distance > 0 && type !== "arrive") {
        instruction += ` (${distance}m進む)`;
    }

    return instruction;
}

// 🗺️ 日本語の道案内リスト（ナビゲーション）を生成して表示する
function updateNavigationDirections(legs) {
    stepsList.innerHTML = "";
    let stepIndex = 1;

    legs.forEach((leg, legIdx) => {
        // 各区間の区切りタイトル
        let legTitle = "";
        if (legIdx === 0) {
            legTitle = "🐾 第1区間: 出発地 ➔ 公園";
        } else if (legIdx === 1) {
            legTitle = "🐾 第2区間: 公園 ➔ 第3経由地";
        } else {
            legTitle = "🐾 第3区間: 第3経由地 ➔ 出発地";
        }

        const legHeader = document.createElement("div");
        legHeader.style.fontWeight = "bold";
        legHeader.style.color = "var(--primary)";
        legHeader.style.marginTop = legIdx > 0 ? "16px" : "4px";
        legHeader.style.marginBottom = "6px";
        legHeader.style.fontSize = "0.95rem";
        legHeader.textContent = legTitle;
        stepsList.appendChild(legHeader);

        // 各ステップを展開してリスト化
        leg.steps.forEach((step) => {
            const instruction = translateManeuver(step);
            if (!instruction) return;

            const stepDiv = document.createElement("div");
            stepDiv.style.padding = "6px 0";
            stepDiv.style.borderBottom = "1px solid var(--border)";
            stepDiv.style.fontSize = "0.85rem";
            stepDiv.style.display = "flex";
            stepDiv.style.alignItems = "flex-start";

            // 番号バッジ
            const badge = document.createElement("span");
            badge.style.display = "inline-block";
            badge.style.width = "18px";
            badge.style.height = "18px";
            badge.style.lineHeight = "18px";
            badge.style.textAlign = "center";
            badge.style.backgroundColor = "var(--primary-light)";
            badge.style.color = "var(--primary)";
            badge.style.borderRadius = "50%";
            badge.style.fontSize = "0.75rem";
            badge.style.marginRight = "10px";
            badge.style.flexShrink = "0";
            badge.textContent = stepIndex++;

            const text = document.createElement("span");
            text.textContent = instruction;

            stepDiv.appendChild(badge);
            stepDiv.appendChild(text);
            stepsList.appendChild(stepDiv);
        });
    });
}
