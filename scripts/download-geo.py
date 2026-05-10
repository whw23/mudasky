"""下载并处理各国省级 GeoJSON 数据。

从 Natural Earth admin-1 数据中提取各国省级边界，
简化几何体，添加多语言名称，保存为独立 GeoJSON 文件。

运行：python3.12 scripts/download-geo.py
"""

import json
import os
import urllib.request
import zipfile
import io

# Natural Earth admin-1 boundaries (1:10m scale, has all countries)
NE_URL = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip"

GEO_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "geo")

# ISO 3166-1 alpha-3 codes for target countries
TARGET_COUNTRIES = {
    "USA": "usa",
    "GBR": "uk",
    "AUS": "australia",
    "CAN": "canada",
    "KOR": "south_korea",
    "FRA": "france",
    "ITA": "italy",
    "RUS": "russia",
    "ESP": "spain",
    "NLD": "netherlands",
    "CHE": "switzerland",
    "NZL": "new_zealand",
    "MYS": "malaysia",
    "THA": "thailand",
    "IND": "india",
}

# fmt: off

# 多语言翻译表（中文 name, 英文, 日文, 德文）
TRANSLATIONS: dict[str, dict[str, dict[str, str]]] = {
    "USA": {
        "Alabama": {"zh": "亚拉巴马", "ja": "アラバマ", "de": "Alabama"},
        "Alaska": {"zh": "阿拉斯加", "ja": "アラスカ", "de": "Alaska"},
        "Arizona": {"zh": "亚利桑那", "ja": "アリゾナ", "de": "Arizona"},
        "Arkansas": {"zh": "阿肯色", "ja": "アーカンソー", "de": "Arkansas"},
        "California": {"zh": "加利福尼亚", "ja": "カリフォルニア", "de": "Kalifornien"},
        "Colorado": {"zh": "科罗拉多", "ja": "コロラド", "de": "Colorado"},
        "Connecticut": {"zh": "康涅狄格", "ja": "コネチカット", "de": "Connecticut"},
        "Delaware": {"zh": "特拉华", "ja": "デラウェア", "de": "Delaware"},
        "Florida": {"zh": "佛罗里达", "ja": "フロリダ", "de": "Florida"},
        "Georgia": {"zh": "佐治亚", "ja": "ジョージア", "de": "Georgia"},
        "Hawaii": {"zh": "夏威夷", "ja": "ハワイ", "de": "Hawaii"},
        "Idaho": {"zh": "爱达荷", "ja": "アイダホ", "de": "Idaho"},
        "Illinois": {"zh": "伊利诺伊", "ja": "イリノイ", "de": "Illinois"},
        "Indiana": {"zh": "印第安纳", "ja": "インディアナ", "de": "Indiana"},
        "Iowa": {"zh": "艾奥瓦", "ja": "アイオワ", "de": "Iowa"},
        "Kansas": {"zh": "堪萨斯", "ja": "カンザス", "de": "Kansas"},
        "Kentucky": {"zh": "肯塔基", "ja": "ケンタッキー", "de": "Kentucky"},
        "Louisiana": {"zh": "路易斯安那", "ja": "ルイジアナ", "de": "Louisiana"},
        "Maine": {"zh": "缅因", "ja": "メイン", "de": "Maine"},
        "Maryland": {"zh": "马里兰", "ja": "メリーランド", "de": "Maryland"},
        "Massachusetts": {"zh": "马萨诸塞", "ja": "マサチューセッツ", "de": "Massachusetts"},
        "Michigan": {"zh": "密歇根", "ja": "ミシガン", "de": "Michigan"},
        "Minnesota": {"zh": "明尼苏达", "ja": "ミネソタ", "de": "Minnesota"},
        "Mississippi": {"zh": "密西西比", "ja": "ミシシッピ", "de": "Mississippi"},
        "Missouri": {"zh": "密苏里", "ja": "ミズーリ", "de": "Missouri"},
        "Montana": {"zh": "蒙大拿", "ja": "モンタナ", "de": "Montana"},
        "Nebraska": {"zh": "内布拉斯加", "ja": "ネブラスカ", "de": "Nebraska"},
        "Nevada": {"zh": "内华达", "ja": "ネバダ", "de": "Nevada"},
        "New Hampshire": {"zh": "新罕布什尔", "ja": "ニューハンプシャー", "de": "New Hampshire"},
        "New Jersey": {"zh": "新泽西", "ja": "ニュージャージー", "de": "New Jersey"},
        "New Mexico": {"zh": "新墨西哥", "ja": "ニューメキシコ", "de": "New Mexico"},
        "New York": {"zh": "纽约", "ja": "ニューヨーク", "de": "New York"},
        "North Carolina": {"zh": "北卡罗来纳", "ja": "ノースカロライナ", "de": "North Carolina"},
        "North Dakota": {"zh": "北达科他", "ja": "ノースダコタ", "de": "North Dakota"},
        "Ohio": {"zh": "俄亥俄", "ja": "オハイオ", "de": "Ohio"},
        "Oklahoma": {"zh": "俄克拉荷马", "ja": "オクラホマ", "de": "Oklahoma"},
        "Oregon": {"zh": "俄勒冈", "ja": "オレゴン", "de": "Oregon"},
        "Pennsylvania": {"zh": "宾夕法尼亚", "ja": "ペンシルベニア", "de": "Pennsylvania"},
        "Rhode Island": {"zh": "罗得岛", "ja": "ロードアイランド", "de": "Rhode Island"},
        "South Carolina": {"zh": "南卡罗来纳", "ja": "サウスカロライナ", "de": "South Carolina"},
        "South Dakota": {"zh": "南达科他", "ja": "サウスダコタ", "de": "South Dakota"},
        "Tennessee": {"zh": "田纳西", "ja": "テネシー", "de": "Tennessee"},
        "Texas": {"zh": "德克萨斯", "ja": "テキサス", "de": "Texas"},
        "Utah": {"zh": "犹他", "ja": "ユタ", "de": "Utah"},
        "Vermont": {"zh": "佛蒙特", "ja": "バーモント", "de": "Vermont"},
        "Virginia": {"zh": "弗吉尼亚", "ja": "バージニア", "de": "Virginia"},
        "Washington": {"zh": "华盛顿", "ja": "ワシントン", "de": "Washington"},
        "West Virginia": {"zh": "西弗吉尼亚", "ja": "ウェストバージニア", "de": "West Virginia"},
        "Wisconsin": {"zh": "威斯康星", "ja": "ウィスコンシン", "de": "Wisconsin"},
        "Wyoming": {"zh": "怀俄明", "ja": "ワイオミング", "de": "Wyoming"},
        "District of Columbia": {"zh": "哥伦比亚特区", "ja": "コロンビア特別区", "de": "District of Columbia"},
    },
    "GBR": {
        "England": {"zh": "英格兰", "ja": "イングランド", "de": "England"},
        "Scotland": {"zh": "苏格兰", "ja": "スコットランド", "de": "Schottland"},
        "Wales": {"zh": "威尔士", "ja": "ウェールズ", "de": "Wales"},
        "Northern Ireland": {"zh": "北爱尔兰", "ja": "北アイルランド", "de": "Nordirland"},
    },
    "AUS": {
        "New South Wales": {"zh": "新南威尔士", "ja": "ニューサウスウェールズ", "de": "New South Wales"},
        "Victoria": {"zh": "维多利亚", "ja": "ビクトリア", "de": "Victoria"},
        "Queensland": {"zh": "昆士兰", "ja": "クイーンズランド", "de": "Queensland"},
        "South Australia": {"zh": "南澳大利亚", "ja": "南オーストラリア", "de": "Südaustralien"},
        "Western Australia": {"zh": "西澳大利亚", "ja": "西オーストラリア", "de": "Westaustralien"},
        "Tasmania": {"zh": "塔斯马尼亚", "ja": "タスマニア", "de": "Tasmanien"},
        "Northern Territory": {"zh": "北领地", "ja": "ノーザンテリトリー", "de": "Northern Territory"},
        "Australian Capital Territory": {"zh": "首都领地", "ja": "オーストラリア首都特別地域", "de": "Australian Capital Territory"},
        "Jervis Bay Territory": {"zh": "杰维斯湾领地", "ja": "ジャービス湾特別地域", "de": "Jervis Bay"},
    },
    "CAN": {
        "Alberta": {"zh": "艾伯塔", "ja": "アルバータ", "de": "Alberta"},
        "British Columbia": {"zh": "不列颠哥伦比亚", "ja": "ブリティッシュコロンビア", "de": "British Columbia"},
        "Manitoba": {"zh": "曼尼托巴", "ja": "マニトバ", "de": "Manitoba"},
        "New Brunswick": {"zh": "新不伦瑞克", "ja": "ニューブランズウィック", "de": "New Brunswick"},
        "Newfoundland and Labrador": {"zh": "纽芬兰与拉布拉多", "ja": "ニューファンドランド・ラブラドール", "de": "Neufundland und Labrador"},
        "Nova Scotia": {"zh": "新斯科舍", "ja": "ノバスコシア", "de": "Nova Scotia"},
        "Ontario": {"zh": "安大略", "ja": "オンタリオ", "de": "Ontario"},
        "Prince Edward Island": {"zh": "爱德华王子岛", "ja": "プリンスエドワードアイランド", "de": "Prince Edward Island"},
        "Québec": {"zh": "魁北克", "ja": "ケベック", "de": "Québec"},
        "Saskatchewan": {"zh": "萨斯喀彻温", "ja": "サスカチュワン", "de": "Saskatchewan"},
        "Northwest Territories": {"zh": "西北地区", "ja": "ノースウエスト準州", "de": "Nordwest-Territorien"},
        "Nunavut": {"zh": "努纳武特", "ja": "ヌナブト", "de": "Nunavut"},
        "Yukon": {"zh": "育空", "ja": "ユーコン", "de": "Yukon"},
    },
    "KOR": {
        "Seoul": {"zh": "首尔特别市", "ja": "ソウル特別市", "de": "Seoul"},
        "Busan": {"zh": "釜山广域市", "ja": "釜山広域市", "de": "Busan"},
        "Daegu": {"zh": "大邱广域市", "ja": "大邱広域市", "de": "Daegu"},
        "Incheon": {"zh": "仁川广域市", "ja": "仁川広域市", "de": "Incheon"},
        "Gwangju": {"zh": "光州广域市", "ja": "光州広域市", "de": "Gwangju"},
        "Daejeon": {"zh": "大田广域市", "ja": "大田広域市", "de": "Daejeon"},
        "Ulsan": {"zh": "蔚山广域市", "ja": "蔚山広域市", "de": "Ulsan"},
        "Sejong": {"zh": "世宗特别自治市", "ja": "世宗特別自治市", "de": "Sejong"},
        "Gyeonggi": {"zh": "京畿道", "ja": "京畿道", "de": "Gyeonggi"},
        "Gangwon": {"zh": "江原道", "ja": "江原道", "de": "Gangwon"},
        "North Chungcheong": {"zh": "忠清北道", "ja": "忠清北道", "de": "Chungcheongbuk"},
        "South Chungcheong": {"zh": "忠清南道", "ja": "忠清南道", "de": "Chungcheongnam"},
        "North Jeolla": {"zh": "全罗北道", "ja": "全羅北道", "de": "Jeollabuk"},
        "South Jeolla": {"zh": "全罗南道", "ja": "全羅南道", "de": "Jeollanam"},
        "North Gyeongsang": {"zh": "庆尚北道", "ja": "慶尚北道", "de": "Gyeongsangbuk"},
        "South Gyeongsang": {"zh": "庆尚南道", "ja": "慶尚南道", "de": "Gyeongsangnam"},
        "Jeju": {"zh": "济州特别自治道", "ja": "済州特別自治道", "de": "Jeju"},
    },
    "FRA": {
        "Île-de-France": {"zh": "法兰西岛", "ja": "イル＝ド＝フランス", "de": "Île-de-France"},
        "Auvergne-Rhône-Alpes": {"zh": "奥弗涅-罗讷-阿尔卑斯", "ja": "オーヴェルニュ＝ローヌ＝アルプ", "de": "Auvergne-Rhône-Alpes"},
        "Bourgogne-Franche-Comté": {"zh": "勃艮第-弗朗什-孔泰", "ja": "ブルゴーニュ＝フランシュ＝コンテ", "de": "Bourgogne-Franche-Comté"},
        "Bretagne": {"zh": "布列塔尼", "ja": "ブルターニュ", "de": "Bretagne"},
        "Centre-Val de Loire": {"zh": "中央-卢瓦尔河谷", "ja": "サントル＝ヴァル・ド・ロワール", "de": "Centre-Val de Loire"},
        "Corse": {"zh": "科西嘉", "ja": "コルシカ", "de": "Korsika"},
        "Grand Est": {"zh": "大东部", "ja": "グラン・テスト", "de": "Grand Est"},
        "Hauts-de-France": {"zh": "上法兰西", "ja": "オー＝ド＝フランス", "de": "Hauts-de-France"},
        "Normandie": {"zh": "诺曼底", "ja": "ノルマンディー", "de": "Normandie"},
        "Nouvelle-Aquitaine": {"zh": "新阿基坦", "ja": "ヌーヴェル＝アキテーヌ", "de": "Nouvelle-Aquitaine"},
        "Occitanie": {"zh": "奥克西塔尼", "ja": "オクシタニー", "de": "Okzitanien"},
        "Pays de la Loire": {"zh": "卢瓦尔河地区", "ja": "ペイ・ド・ラ・ロワール", "de": "Pays de la Loire"},
        "Provence-Alpes-Côte d'Azur": {"zh": "普罗旺斯-阿尔卑斯-蓝色海岸", "ja": "プロヴァンス＝アルプ＝コート・ダジュール", "de": "Provence-Alpes-Côte d'Azur"},
    },
    "ITA": {
        "Piemonte": {"zh": "皮埃蒙特", "ja": "ピエモンテ", "de": "Piemont"},
        "Valle d'Aosta": {"zh": "瓦莱达奥斯塔", "ja": "ヴァッレ・ダオスタ", "de": "Aostatal"},
        "Lombardia": {"zh": "伦巴第", "ja": "ロンバルディア", "de": "Lombardei"},
        "Trentino-Alto Adige": {"zh": "特伦蒂诺-上阿迪杰", "ja": "トレンティーノ＝アルト・アディジェ", "de": "Trentino-Südtirol"},
        "Veneto": {"zh": "威尼托", "ja": "ヴェネト", "de": "Venetien"},
        "Friuli-Venezia Giulia": {"zh": "弗留利-威尼斯朱利亚", "ja": "フリウリ＝ヴェネツィア・ジュリア", "de": "Friaul-Julisch Venetien"},
        "Liguria": {"zh": "利古里亚", "ja": "リグーリア", "de": "Ligurien"},
        "Emilia-Romagna": {"zh": "艾米利亚-罗马涅", "ja": "エミリア＝ロマーニャ", "de": "Emilia-Romagna"},
        "Toscana": {"zh": "托斯卡纳", "ja": "トスカーナ", "de": "Toskana"},
        "Umbria": {"zh": "翁布里亚", "ja": "ウンブリア", "de": "Umbrien"},
        "Marche": {"zh": "马尔凯", "ja": "マルケ", "de": "Marken"},
        "Lazio": {"zh": "拉齐奥", "ja": "ラツィオ", "de": "Latium"},
        "Abruzzo": {"zh": "阿布鲁佐", "ja": "アブルッツォ", "de": "Abruzzen"},
        "Molise": {"zh": "莫利塞", "ja": "モリーゼ", "de": "Molise"},
        "Campania": {"zh": "坎帕尼亚", "ja": "カンパニア", "de": "Kampanien"},
        "Puglia": {"zh": "普利亚", "ja": "プッリャ", "de": "Apulien"},
        "Basilicata": {"zh": "巴西利卡塔", "ja": "バジリカータ", "de": "Basilikata"},
        "Calabria": {"zh": "卡拉布里亚", "ja": "カラブリア", "de": "Kalabrien"},
        "Sicilia": {"zh": "西西里", "ja": "シチリア", "de": "Sizilien"},
        "Sardegna": {"zh": "撒丁", "ja": "サルデーニャ", "de": "Sardinien"},
    },
    "RUS": {},  # 俄罗斯联邦主体太多（85个），用英文名自动处理
    "ESP": {
        "Andalucía": {"zh": "安达卢西亚", "ja": "アンダルシア", "de": "Andalusien"},
        "Aragón": {"zh": "阿拉贡", "ja": "アラゴン", "de": "Aragonien"},
        "Asturias": {"zh": "阿斯图里亚斯", "ja": "アストゥリアス", "de": "Asturien"},
        "Islas Baleares": {"zh": "巴利阿里群岛", "ja": "バレアレス諸島", "de": "Balearen"},
        "País Vasco": {"zh": "巴斯克", "ja": "バスク", "de": "Baskenland"},
        "Islas Canarias": {"zh": "加那利群岛", "ja": "カナリア諸島", "de": "Kanarische Inseln"},
        "Cantabria": {"zh": "坎塔布里亚", "ja": "カンタブリア", "de": "Kantabrien"},
        "Castilla y León": {"zh": "卡斯蒂利亚-莱昂", "ja": "カスティーリャ・イ・レオン", "de": "Kastilien und León"},
        "Castilla-La Mancha": {"zh": "卡斯蒂利亚-拉曼恰", "ja": "カスティーリャ＝ラ・マンチャ", "de": "Kastilien-La Mancha"},
        "Cataluña": {"zh": "加泰罗尼亚", "ja": "カタルーニャ", "de": "Katalonien"},
        "Extremadura": {"zh": "埃斯特雷马杜拉", "ja": "エストレマドゥーラ", "de": "Extremadura"},
        "Galicia": {"zh": "加利西亚", "ja": "ガリシア", "de": "Galicien"},
        "La Rioja": {"zh": "拉里奥哈", "ja": "ラ・リオハ", "de": "La Rioja"},
        "Comunidad de Madrid": {"zh": "马德里", "ja": "マドリード", "de": "Madrid"},
        "Región de Murcia": {"zh": "穆尔西亚", "ja": "ムルシア", "de": "Murcia"},
        "Comunidad Foral de Navarra": {"zh": "纳瓦拉", "ja": "ナバラ", "de": "Navarra"},
        "Comunidad Valenciana": {"zh": "巴伦西亚", "ja": "バレンシア", "de": "Valencia"},
        "Ceuta": {"zh": "休达", "ja": "セウタ", "de": "Ceuta"},
        "Melilla": {"zh": "梅利利亚", "ja": "メリリャ", "de": "Melilla"},
    },
    "NLD": {
        "Drenthe": {"zh": "德伦特", "ja": "ドレンテ", "de": "Drenthe"},
        "Flevoland": {"zh": "弗莱福兰", "ja": "フレヴォラント", "de": "Flevoland"},
        "Friesland": {"zh": "弗里斯兰", "ja": "フリースラント", "de": "Friesland"},
        "Gelderland": {"zh": "海尔德兰", "ja": "ヘルダーラント", "de": "Gelderland"},
        "Groningen": {"zh": "格罗宁根", "ja": "フローニンゲン", "de": "Groningen"},
        "Limburg": {"zh": "林堡", "ja": "リンブルフ", "de": "Limburg"},
        "Noord-Brabant": {"zh": "北布拉班特", "ja": "北ブラバント", "de": "Nordbrabant"},
        "Noord-Holland": {"zh": "北荷兰", "ja": "北ホラント", "de": "Nordholland"},
        "Overijssel": {"zh": "上艾瑟尔", "ja": "オーファーアイセル", "de": "Overijssel"},
        "Utrecht": {"zh": "乌特勒支", "ja": "ユトレヒト", "de": "Utrecht"},
        "Zeeland": {"zh": "泽兰", "ja": "ゼーラント", "de": "Zeeland"},
        "Zuid-Holland": {"zh": "南荷兰", "ja": "南ホラント", "de": "Südholland"},
    },
    "CHE": {
        "Zürich": {"zh": "苏黎世", "ja": "チューリッヒ", "de": "Zürich"},
        "Bern": {"zh": "伯尔尼", "ja": "ベルン", "de": "Bern"},
        "Luzern": {"zh": "卢塞恩", "ja": "ルツェルン", "de": "Luzern"},
        "Uri": {"zh": "乌里", "ja": "ウーリ", "de": "Uri"},
        "Schwyz": {"zh": "施维茨", "ja": "シュヴィーツ", "de": "Schwyz"},
        "Obwalden": {"zh": "上瓦尔登", "ja": "オプヴァルデン", "de": "Obwalden"},
        "Nidwalden": {"zh": "下瓦尔登", "ja": "ニトヴァルデン", "de": "Nidwalden"},
        "Glarus": {"zh": "格拉鲁斯", "ja": "グラールス", "de": "Glarus"},
        "Zug": {"zh": "楚格", "ja": "ツーク", "de": "Zug"},
        "Fribourg": {"zh": "弗里堡", "ja": "フリブール", "de": "Freiburg"},
        "Solothurn": {"zh": "索洛图恩", "ja": "ゾロトゥルン", "de": "Solothurn"},
        "Basel-Stadt": {"zh": "巴塞尔城市", "ja": "バーゼル＝シュタット", "de": "Basel-Stadt"},
        "Basel-Landschaft": {"zh": "巴塞尔乡村", "ja": "バーゼル＝ラントシャフト", "de": "Basel-Landschaft"},
        "Schaffhausen": {"zh": "沙夫豪森", "ja": "シャフハウゼン", "de": "Schaffhausen"},
        "Appenzell Ausserrhoden": {"zh": "外阿彭策尔", "ja": "アッペンツェル・アウサーローデン", "de": "Appenzell Ausserrhoden"},
        "Appenzell Innerrhoden": {"zh": "内阿彭策尔", "ja": "アッペンツェル・インナーローデン", "de": "Appenzell Innerrhoden"},
        "Sankt Gallen": {"zh": "圣加仑", "ja": "ザンクト・ガレン", "de": "St. Gallen"},
        "Graubünden": {"zh": "格劳宾登", "ja": "グラウビュンデン", "de": "Graubünden"},
        "Aargau": {"zh": "阿尔高", "ja": "アールガウ", "de": "Aargau"},
        "Thurgau": {"zh": "图尔高", "ja": "トゥールガウ", "de": "Thurgau"},
        "Ticino": {"zh": "提契诺", "ja": "ティチーノ", "de": "Tessin"},
        "Vaud": {"zh": "沃", "ja": "ヴォー", "de": "Waadt"},
        "Valais": {"zh": "瓦莱", "ja": "ヴァレー", "de": "Wallis"},
        "Neuchâtel": {"zh": "纳沙泰尔", "ja": "ヌーシャテル", "de": "Neuenburg"},
        "Genève": {"zh": "日内瓦", "ja": "ジュネーヴ", "de": "Genf"},
        "Jura": {"zh": "汝拉", "ja": "ジュラ", "de": "Jura"},
    },
    "NZL": {
        "Northland": {"zh": "北地", "ja": "ノースランド", "de": "Northland"},
        "Auckland": {"zh": "奥克兰", "ja": "オークランド", "de": "Auckland"},
        "Waikato": {"zh": "怀卡托", "ja": "ワイカト", "de": "Waikato"},
        "Bay of Plenty": {"zh": "丰盛湾", "ja": "ベイ・オブ・プレンティ", "de": "Bay of Plenty"},
        "Gisborne": {"zh": "吉斯伯恩", "ja": "ギズボーン", "de": "Gisborne"},
        "Hawke's Bay": {"zh": "霍克湾", "ja": "ホークス・ベイ", "de": "Hawke's Bay"},
        "Taranaki": {"zh": "塔拉纳基", "ja": "タラナキ", "de": "Taranaki"},
        "Manawatu-Wanganui": {"zh": "马纳瓦图-旺格努伊", "ja": "マナワツ＝ワンガヌイ", "de": "Manawatu-Wanganui"},
        "Wellington": {"zh": "惠灵顿", "ja": "ウェリントン", "de": "Wellington"},
        "Tasman": {"zh": "塔斯曼", "ja": "タスマン", "de": "Tasman"},
        "Nelson": {"zh": "尼尔森", "ja": "ネルソン", "de": "Nelson"},
        "Marlborough": {"zh": "马尔堡", "ja": "マールボロ", "de": "Marlborough"},
        "West Coast": {"zh": "西海岸", "ja": "ウエストコースト", "de": "West Coast"},
        "Canterbury": {"zh": "坎特伯雷", "ja": "カンタベリー", "de": "Canterbury"},
        "Otago": {"zh": "奥塔哥", "ja": "オタゴ", "de": "Otago"},
        "Southland": {"zh": "南地", "ja": "サウスランド", "de": "Southland"},
    },
    "MYS": {
        "Johor": {"zh": "柔佛", "ja": "ジョホール", "de": "Johor"},
        "Kedah": {"zh": "吉打", "ja": "ケダ", "de": "Kedah"},
        "Kelantan": {"zh": "吉兰丹", "ja": "クランタン", "de": "Kelantan"},
        "Melaka": {"zh": "马六甲", "ja": "マラッカ", "de": "Malakka"},
        "Negeri Sembilan": {"zh": "森美兰", "ja": "ヌグリ・スンビラン", "de": "Negeri Sembilan"},
        "Pahang": {"zh": "彭亨", "ja": "パハン", "de": "Pahang"},
        "Perak": {"zh": "霹雳", "ja": "ペラ", "de": "Perak"},
        "Perlis": {"zh": "玻璃市", "ja": "ペルリス", "de": "Perlis"},
        "Pulau Pinang": {"zh": "槟城", "ja": "ペナン", "de": "Penang"},
        "Sabah": {"zh": "沙巴", "ja": "サバ", "de": "Sabah"},
        "Sarawak": {"zh": "砂拉越", "ja": "サラワク", "de": "Sarawak"},
        "Selangor": {"zh": "雪兰莪", "ja": "セランゴール", "de": "Selangor"},
        "Terengganu": {"zh": "登嘉楼", "ja": "トレンガヌ", "de": "Terengganu"},
        "Kuala Lumpur": {"zh": "吉隆坡", "ja": "クアラルンプール", "de": "Kuala Lumpur"},
        "Putrajaya": {"zh": "布城", "ja": "プトラジャヤ", "de": "Putrajaya"},
        "Labuan": {"zh": "纳闽", "ja": "ラブアン", "de": "Labuan"},
    },
    "THA": {},  # 泰国 77 个府，用英文名自动处理
    "IND": {},  # 印度 28 个邦，用英文名自动处理
}

# fmt: on


def download_natural_earth(cache_dir: str) -> str:
    """下载 Natural Earth admin-1 数据，返回解压目录。"""
    cache_zip = os.path.join(cache_dir, "ne_10m_admin_1.zip")
    extract_dir = os.path.join(cache_dir, "ne_10m_admin_1")

    if os.path.exists(extract_dir):
        print("  Using cached Natural Earth data")
        return extract_dir

    os.makedirs(cache_dir, exist_ok=True)

    if not os.path.exists(cache_zip):
        print(f"  Downloading Natural Earth admin-1 data...")
        urllib.request.urlretrieve(NE_URL, cache_zip)
        print(f"  Downloaded: {os.path.getsize(cache_zip) / 1024:.0f} KB")

    print("  Extracting...")
    with zipfile.ZipFile(cache_zip) as zf:
        zf.extractall(extract_dir)

    return extract_dir



# 英国需要按四个构成国聚合（232 个 county → 4 个国家）
UK_ISO_MAP = {
    "GB-ENG": "England", "GB-SCT": "Scotland", "GB-WLS": "Wales", "GB-NIR": "Northern Ireland",
}

# 法国本土大区名称映射（Natural Earth name → 翻译表 key）
FRANCE_REGION_MAP = {
    "Île-de-France": "Île-de-France",
    "Auvergne-Rhône-Alpes": "Auvergne-Rhône-Alpes",
    "Bourgogne-Franche-Comté": "Bourgogne-Franche-Comté",
    "Bretagne": "Bretagne",
    "Centre-Val de Loire": "Centre-Val de Loire",
    "Corse": "Corse",
    "Grand Est": "Grand Est",
    "Hauts-de-France": "Hauts-de-France",
    "Normandie": "Normandie",
    "Nouvelle-Aquitaine": "Nouvelle-Aquitaine",
    "Occitanie": "Occitanie",
    "Pays de la Loire": "Pays de la Loire",
    "Provence-Alpes-Côte d'Azur": "Provence-Alpes-Côte d'Azur",
}


def process_country(gdf: "any", iso_a3: str, filename: str, translations: dict) -> None:
    """提取单个国家的省级边界，简化几何体，添加多语言名称。"""
    from shapely.geometry import mapping
    from shapely.ops import unary_union
    import geopandas as gpd

    country_gdf = gdf[gdf["adm0_a3"] == iso_a3].copy()
    if len(country_gdf) == 0:
        country_gdf = gdf[gdf["sov_a3"] == iso_a3].copy()
    if len(country_gdf) == 0:
        print(f"  WARNING: No data for {iso_a3}")
        return

    # 按国家选择处理策略
    if iso_a3 == "GBR":
        features = _process_uk(country_gdf, translations)
    elif iso_a3 == "FRA":
        features = _process_france(country_gdf, translations)
    elif iso_a3 == "ITA":
        features = _process_by_region(country_gdf, translations)
    elif iso_a3 == "ESP":
        features = _process_by_region(country_gdf, translations)
    else:
        features = _process_generic(country_gdf, translations)

    geojson = {"type": "FeatureCollection", "features": features}
    filepath = os.path.join(GEO_DIR, filename)
    import math
    text = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    text = text.replace(":NaN", ":null")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(text)

    size_kb = os.path.getsize(filepath) / 1024
    print(f"  {filename}: {len(features)} features, {size_kb:.0f} KB")


SIMPLIFY_TOLERANCE = 0.02

def _process_generic(gdf: "any", translations: dict) -> list:
    """通用国家处理。"""
    from shapely.geometry import mapping

    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)

    features = []
    for _, row in gdf.iterrows():
        en_name = row.get("name", "") or row.get("name_en", "") or ""
        trans = translations.get(en_name, {})
        props = {
            "name": trans.get("zh", en_name),
            "name_en": en_name,
            "name_ja": trans.get("ja", en_name),
            "name_de": trans.get("de", en_name),
        }
        features.append({"type": "Feature", "properties": props, "geometry": mapping(row["geometry"])})
    return features


def _process_uk(gdf: "any", translations: dict) -> list:
    """英国按四个构成国聚合。"""
    from shapely.geometry import mapping
    from shapely.ops import unary_union

    groups: dict[str, list] = {}
    for _, row in gdf.iterrows():
        iso = row.get("iso_3166_2", "") or ""
        prefix = iso[:6] if len(iso) >= 6 else ""
        nation = UK_ISO_MAP.get(prefix)
        if not nation:
            # 猜测：根据 type_en
            type_en = row.get("type_en", "") or ""
            if "wales" in type_en.lower():
                nation = "Wales"
            elif row.get("region", "").startswith("Northern Ireland"):
                nation = "Northern Ireland"
            elif "Kingdom" in type_en:
                nation = "Scotland"
            else:
                nation = "England"
        groups.setdefault(nation, []).append(row["geometry"])

    features = []
    for en_name, geoms in groups.items():
        merged = unary_union(geoms).simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        trans = translations.get(en_name, {})
        props = {
            "name": trans.get("zh", en_name),
            "name_en": en_name,
            "name_ja": trans.get("ja", en_name),
            "name_de": trans.get("de", en_name),
        }
        features.append({"type": "Feature", "properties": props, "geometry": mapping(merged)})
    return features


def _process_france(gdf: "any", translations: dict) -> list:
    """法国按大区聚合，过滤海外领土。"""
    from shapely.geometry import mapping
    from shapely.ops import unary_union

    # 只保留本土（纬度 > 40 或科西嘉 > 41）
    mainland = gdf[gdf.geometry.centroid.y > 40].copy()

    groups: dict[str, list] = {}
    for _, row in mainland.iterrows():
        region = row.get("region", "") or row.get("name", "") or ""
        # 尝试匹配大区名
        matched = False
        for key in FRANCE_REGION_MAP:
            if key.lower() in region.lower() or region.lower() in key.lower():
                groups.setdefault(key, []).append(row["geometry"])
                matched = True
                break
        if not matched:
            groups.setdefault(region, []).append(row["geometry"])

    features = []
    for region_name, geoms in groups.items():
        merged = unary_union(geoms).simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        en_name = region_name
        trans = translations.get(en_name, {})
        props = {
            "name": trans.get("zh", en_name),
            "name_en": en_name,
            "name_ja": trans.get("ja", en_name),
            "name_de": trans.get("de", en_name),
        }
        features.append({"type": "Feature", "properties": props, "geometry": mapping(merged)})
    return features


def _process_by_region(gdf: "any", translations: dict) -> list:
    """按 region 字段聚合（意大利、西班牙等）。"""
    from shapely.geometry import mapping
    from shapely.ops import unary_union

    groups: dict[str, list] = {}
    for _, row in gdf.iterrows():
        region = row.get("region", "") or row.get("name", "") or ""
        groups.setdefault(region, []).append(row["geometry"])

    features = []
    for region_name, geoms in groups.items():
        merged = unary_union(geoms).simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        en_name = region_name
        trans = translations.get(en_name, {})
        props = {
            "name": trans.get("zh", en_name),
            "name_en": en_name,
            "name_ja": trans.get("ja", en_name),
            "name_de": trans.get("de", en_name),
        }
        features.append({"type": "Feature", "properties": props, "geometry": mapping(merged)})
    return features


def main() -> None:
    """主入口。"""
    import geopandas as gpd

    cache_dir = os.path.join(os.path.dirname(__file__), ".cache")
    ne_dir = download_natural_earth(cache_dir)

    # 加载 Natural Earth shapefile
    shp_path = os.path.join(ne_dir, "ne_10m_admin_1_states_provinces.shp")
    print("Loading Natural Earth shapefile...")
    gdf = gpd.read_file(shp_path)
    print(f"  Total features: {len(gdf)}")

    # 处理每个国家
    for iso_a3, filename in TARGET_COUNTRIES.items():
        print(f"\nProcessing {iso_a3}...")
        translations = TRANSLATIONS.get(iso_a3, {})
        process_country(gdf, iso_a3, f"{filename}.json", translations)

    print("\nDone! Remember to update DETAIL_MAPS in UniversityMapInner.tsx")


if __name__ == "__main__":
    main()
