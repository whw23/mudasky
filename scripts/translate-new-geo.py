"""给新增 15 国 GeoJSON 文件补全多语言翻译。

这些文件的 name 字段已经是中文（由 download-geo.py 通过翻译表生成），
但部分国家（俄罗斯、泰国、印度等）翻译表为空，name 仍为英文。
本脚本补全所有缺失的翻译。

运行：python3 scripts/translate-new-geo.py
"""

import json
import os

GEO_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "geo")

# fmt: off

RUSSIA_NAMES = {
    "Gorno-Altay": {"zh": "戈尔诺-阿尔泰", "ja": "ゴルノ＝アルタイ共和国", "de": "Republik Altai"},
    "Pskov": {"zh": "普斯科夫", "ja": "プスコフ州", "de": "Oblast Pskow"},
    "Krasnodar": {"zh": "克拉斯诺达尔", "ja": "クラスノダール地方", "de": "Region Krasnodar"},
    "Karachay-Cherkess": {"zh": "卡拉恰伊-切尔克斯", "ja": "カラチャイ・チェルケス共和国", "de": "Karatschai-Tscherkessien"},
    "Kabardin-Balkar": {"zh": "卡巴尔达-巴尔卡尔", "ja": "カバルダ・バルカル共和国", "de": "Kabardino-Balkarien"},
    "North Ossetia": {"zh": "北奥塞梯", "ja": "北オセチア共和国", "de": "Nordossetien"},
    "Ingush": {"zh": "印古什", "ja": "イングーシ共和国", "de": "Inguschetien"},
    "Chechnya": {"zh": "车臣", "ja": "チェチェン共和国", "de": "Tschetschenien"},
    "Dagestan": {"zh": "达吉斯坦", "ja": "ダゲスタン共和国", "de": "Dagestan"},
    "Murmansk": {"zh": "摩尔曼斯克", "ja": "ムルマンスク州", "de": "Oblast Murmansk"},
    "Karelia": {"zh": "卡累利阿", "ja": "カレリア共和国", "de": "Republik Karelien"},
    "Leningrad": {"zh": "列宁格勒", "ja": "レニングラード州", "de": "Oblast Leningrad"},
    "Kaliningrad": {"zh": "加里宁格勒", "ja": "カリーニングラード州", "de": "Oblast Kaliningrad"},
    "Smolensk": {"zh": "斯摩棱斯克", "ja": "スモレンスク州", "de": "Oblast Smolensk"},
    "Bryansk": {"zh": "布良斯克", "ja": "ブリャンスク州", "de": "Oblast Brjansk"},
    "Kursk": {"zh": "库尔斯克", "ja": "クルスク州", "de": "Oblast Kursk"},
    "Belgorod": {"zh": "别尔哥罗德", "ja": "ベルゴロド州", "de": "Oblast Belgorod"},
    "Voronezh": {"zh": "沃罗涅日", "ja": "ヴォロネジ州", "de": "Oblast Woronesch"},
    "Rostov": {"zh": "罗斯托夫", "ja": "ロストフ州", "de": "Oblast Rostow"},
    "Buryat": {"zh": "布里亚特", "ja": "ブリヤート共和国", "de": "Burjatien"},
    "Tuva": {"zh": "图瓦", "ja": "トゥヴァ共和国", "de": "Tuwa"},
    "Chita": {"zh": "赤塔", "ja": "ザバイカリエ地方", "de": "Region Transbaikalien"},
    "Amur": {"zh": "阿穆尔", "ja": "アムール州", "de": "Oblast Amur"},
    "Yevrey": {"zh": "犹太自治州", "ja": "ユダヤ自治州", "de": "Jüdische Autonome Oblast"},
    "Khabarovsk": {"zh": "哈巴罗夫斯克", "ja": "ハバロフスク地方", "de": "Region Chabarowsk"},
    "Primor'ye": {"zh": "滨海边疆区", "ja": "沿海地方", "de": "Region Primorje"},
    "Tyumen'": {"zh": "秋明", "ja": "チュメニ州", "de": "Oblast Tjumen"},
    "Kurgan": {"zh": "库尔干", "ja": "クルガン州", "de": "Oblast Kurgan"},
    "Omsk": {"zh": "鄂木斯克", "ja": "オムスク州", "de": "Oblast Omsk"},
    "Novosibirsk": {"zh": "新西伯利亚", "ja": "ノヴォシビルスク州", "de": "Oblast Nowosibirsk"},
    "Chelyabinsk": {"zh": "车里雅宾斯克", "ja": "チェリャビンスク州", "de": "Oblast Tscheljabinsk"},
    "Altay": {"zh": "阿尔泰边疆区", "ja": "アルタイ地方", "de": "Region Altai"},
    "Orenburg": {"zh": "奥伦堡", "ja": "オレンブルク州", "de": "Oblast Orenburg"},
    "Saratov": {"zh": "萨拉托夫", "ja": "サラトフ州", "de": "Oblast Saratow"},
    "Astrakhan'": {"zh": "阿斯特拉罕", "ja": "アストラハン州", "de": "Oblast Astrachan"},
    "Volgograd": {"zh": "伏尔加格勒", "ja": "ヴォルゴグラード州", "de": "Oblast Wolgograd"},
    "Crimea": {"zh": "克里米亚", "ja": "クリミア共和国", "de": "Republik Krim"},
    "Maga Buryatdan": {"zh": "马加丹", "ja": "マガダン州", "de": "Oblast Magadan"},
    "Sakhalin": {"zh": "萨哈林", "ja": "サハリン州", "de": "Oblast Sachalin"},
    "Sevastopol": {"zh": "塞瓦斯托波尔", "ja": "セヴァストポリ", "de": "Sewastopol"},
    "Chukchi Autonomous Okrug": {"zh": "楚科奇", "ja": "チュクチ自治管区", "de": "Autonomer Kreis der Tschuktschen"},
    "Yamal-Nenets": {"zh": "亚马尔-涅涅茨", "ja": "ヤマロ・ネネツ自治管区", "de": "Autonomer Kreis der Jamal-Nenzen"},
    "Nenets": {"zh": "涅涅茨", "ja": "ネネツ自治管区", "de": "Autonomer Kreis der Nenzen"},
    "Sakha (Yakutia)": {"zh": "萨哈（雅库特）", "ja": "サハ共和国", "de": "Republik Sacha"},
    "City of St. Petersburg": {"zh": "圣彼得堡", "ja": "サンクトペテルブルク", "de": "Sankt Petersburg"},
    "Arkhangel'sk": {"zh": "阿尔汉格尔斯克", "ja": "アルハンゲリスク州", "de": "Oblast Archangelsk"},
    "Krasnoyarsk": {"zh": "克拉斯诺亚尔斯克", "ja": "クラスノヤルスク地方", "de": "Region Krasnojarsk"},
    "Kalmyk": {"zh": "卡尔梅克", "ja": "カルムイク共和国", "de": "Kalmückien"},
    "Kamchatka": {"zh": "堪察加", "ja": "カムチャツカ地方", "de": "Region Kamtschatka"},
    "Bashkortostan": {"zh": "巴什科尔托斯坦", "ja": "バシコルトスタン共和国", "de": "Baschkortostan"},
    "Sverdlovsk": {"zh": "斯维尔德洛夫斯克", "ja": "スヴェルドロフスク州", "de": "Oblast Swerdlowsk"},
    "Khanty-Mansiy": {"zh": "汉特-曼西", "ja": "ハンティ・マンシ自治管区", "de": "Autonomer Kreis der Chanten und Mansen"},
    "Lipetsk": {"zh": "利佩茨克", "ja": "リペツク州", "de": "Oblast Lipezk"},
    "Tambov": {"zh": "坦波夫", "ja": "タンボフ州", "de": "Oblast Tambow"},
    "Tomsk": {"zh": "托木斯克", "ja": "トムスク州", "de": "Oblast Tomsk"},
    "Tatarstan": {"zh": "鞑靼斯坦", "ja": "タタールスタン共和国", "de": "Tatarstan"},
    "Ul'yanovsk": {"zh": "乌里扬诺夫斯克", "ja": "ウリヤノフスク州", "de": "Oblast Uljanowsk"},
    "Penza": {"zh": "奔萨", "ja": "ペンザ州", "de": "Oblast Pensa"},
    "Kemerovo": {"zh": "科麦罗沃", "ja": "ケメロヴォ州", "de": "Oblast Kemerowo"},
    "Orel": {"zh": "奥廖尔", "ja": "オリョール州", "de": "Oblast Orjol"},
    "Irkutsk": {"zh": "伊尔库茨克", "ja": "イルクーツク州", "de": "Oblast Irkutsk"},
    "Khakass": {"zh": "哈卡斯", "ja": "ハカス共和国", "de": "Chakassien"},
    "Mordovia": {"zh": "莫尔多瓦", "ja": "モルドヴィア共和国", "de": "Mordwinien"},
    "Kaluga": {"zh": "卡卢加", "ja": "カルーガ州", "de": "Oblast Kaluga"},
    "Kostroma": {"zh": "科斯特罗马", "ja": "コストロマ州", "de": "Oblast Kostroma"},
    "Yaroslavl'": {"zh": "雅罗斯拉夫尔", "ja": "ヤロスラヴリ州", "de": "Oblast Jaroslawl"},
    "Vladimir": {"zh": "弗拉基米尔", "ja": "ウラジーミル州", "de": "Oblast Wladimir"},
    "Ryazan'": {"zh": "梁赞", "ja": "リャザン州", "de": "Oblast Rjasan"},
    "Ivanovo": {"zh": "伊万诺沃", "ja": "イヴァノヴォ州", "de": "Oblast Iwanowo"},
    "Nizhegorod": {"zh": "下诺夫哥罗德", "ja": "ニジニ・ノヴゴロド州", "de": "Oblast Nischni Nowgorod"},
    "Tula": {"zh": "图拉", "ja": "トゥーラ州", "de": "Oblast Tula"},
    "Chuvash": {"zh": "楚瓦什", "ja": "チュヴァシ共和国", "de": "Tschuwaschien"},
    "Vologda": {"zh": "沃洛格达", "ja": "ヴォログダ州", "de": "Oblast Wologda"},
    "Novgorod": {"zh": "诺夫哥罗德", "ja": "ノヴゴロド州", "de": "Oblast Nowgorod"},
    "Tver'": {"zh": "特维尔", "ja": "トヴェリ州", "de": "Oblast Twer"},
    "Moskovskaya": {"zh": "莫斯科州", "ja": "モスクワ州", "de": "Oblast Moskau"},
    "Moskva": {"zh": "莫斯科", "ja": "モスクワ", "de": "Moskau"},
    "Mariy-El": {"zh": "马里埃尔", "ja": "マリ・エル共和国", "de": "Mari El"},
    "Kirov": {"zh": "基洛夫", "ja": "キーロフ州", "de": "Oblast Kirow"},
    "Udmurt": {"zh": "乌德穆尔特", "ja": "ウドムルト共和国", "de": "Udmurtien"},
    "Komi": {"zh": "科米", "ja": "コミ共和国", "de": "Republik Komi"},
    "Perm'": {"zh": "彼尔姆", "ja": "ペルミ地方", "de": "Region Perm"},
    "Samara": {"zh": "萨马拉", "ja": "サマラ州", "de": "Oblast Samara"},
    "Stavropol'": {"zh": "斯塔夫罗波尔", "ja": "スタヴロポリ地方", "de": "Region Stawropol"},
    "Adygey": {"zh": "阿迪格", "ja": "アディゲ共和国", "de": "Adygeja"},
}

THAILAND_NAMES = {
    "Surin": {"zh": "素林", "ja": "スリン県", "de": "Surin"},
    "Si Sa Ket": {"zh": "四色菊", "ja": "シーサケート県", "de": "Si Sa Ket"},
    "Ubon Ratchathani": {"zh": "乌汶叻差他尼", "ja": "ウボンラーチャターニー県", "de": "Ubon Ratchathani"},
    "Sa Kaeo": {"zh": "沙缴", "ja": "サケーオ県", "de": "Sa Kaeo"},
    "Buri Ram": {"zh": "武里南", "ja": "ブリーラム県", "de": "Buri Ram"},
    "Trat": {"zh": "达叻", "ja": "トラート県", "de": "Trat"},
    "Chanthaburi": {"zh": "尖竹汶", "ja": "チャンタブリー県", "de": "Chanthaburi"},
    "Satun": {"zh": "沙敦", "ja": "サトゥーン県", "de": "Satun"},
    "Songkhla": {"zh": "宋卡", "ja": "ソンクラー県", "de": "Songkhla"},
    "Yala": {"zh": "也拉", "ja": "ヤラー県", "de": "Yala"},
    "Narathiwat": {"zh": "那拉提瓦", "ja": "ナラーティワート県", "de": "Narathiwat"},
    "Chiang Rai": {"zh": "清莱", "ja": "チェンラーイ県", "de": "Chiang Rai"},
    "Chiang Mai": {"zh": "清迈", "ja": "チェンマイ県", "de": "Chiang Mai"},
    "Mae Hong Son": {"zh": "夜丰颂", "ja": "メーホンソーン県", "de": "Mae Hong Son"},
    "Tak": {"zh": "达府", "ja": "ターク県", "de": "Tak"},
    "Kanchanaburi": {"zh": "北碧", "ja": "カーンチャナブリー県", "de": "Kanchanaburi"},
    "Prachuap Khiri Khan": {"zh": "巴蜀", "ja": "プラチュワップキーリーカン県", "de": "Prachuap Khiri Khan"},
    "Phetchaburi": {"zh": "碧武里", "ja": "ペッチャブリー県", "de": "Phetchaburi"},
    "Ratchaburi": {"zh": "叻丕", "ja": "ラーチャブリー県", "de": "Ratchaburi"},
    "Chumphon": {"zh": "春蓬", "ja": "チュムポーン県", "de": "Chumphon"},
    "Ranong": {"zh": "拉廊", "ja": "ラノーン県", "de": "Ranong"},
    "Phayao": {"zh": "帕尧", "ja": "パヤオ県", "de": "Phayao"},
    "Nan": {"zh": "南", "ja": "ナーン県", "de": "Nan"},
    "Uttaradit": {"zh": "程逸", "ja": "ウッタラディット県", "de": "Uttaradit"},
    "Phitsanulok": {"zh": "彭世洛", "ja": "ピッサヌローク県", "de": "Phitsanulok"},
    "Loei": {"zh": "黎", "ja": "ルーイ県", "de": "Loei"},
    "Bueng Kan": {"zh": "汶干", "ja": "ブンカーン県", "de": "Bueng Kan"},
    "Nong Khai": {"zh": "廊开", "ja": "ノーンカーイ県", "de": "Nong Khai"},
    "Nakhon Phanom": {"zh": "那空帕农", "ja": "ナコーンパノム県", "de": "Nakhon Phanom"},
    "Mukdahan": {"zh": "穆达汉", "ja": "ムックダーハーン県", "de": "Mukdahan"},
    "Amnat Charoen": {"zh": "安纳乍能", "ja": "アムナートチャルーン県", "de": "Amnat Charoen"},
    "Phangnga": {"zh": "攀牙", "ja": "パンガー県", "de": "Phangnga"},
    "Krabi": {"zh": "甲米", "ja": "クラビー県", "de": "Krabi"},
    "Trang": {"zh": "董里", "ja": "トラン県", "de": "Trang"},
    "Pattani": {"zh": "北大年", "ja": "パッターニー県", "de": "Pattani"},
    "Phatthalung": {"zh": "博他仑", "ja": "パッタルン県", "de": "Phatthalung"},
    "Nakhon Si Thammarat": {"zh": "那空是贪玛叻", "ja": "ナコーンシータンマラート県", "de": "Nakhon Si Thammarat"},
    "Surat Thani": {"zh": "素叻他尼", "ja": "スラートターニー県", "de": "Surat Thani"},
    "Samut Songkhram": {"zh": "夜功", "ja": "サムットソンクラーム県", "de": "Samut Songkhram"},
    "Samut Sakhon": {"zh": "龙仔厝", "ja": "サムットサーコーン県", "de": "Samut Sakhon"},
    "Bangkok Metropolis": {"zh": "曼谷", "ja": "バンコク都", "de": "Bangkok"},
    "Samut Prakan": {"zh": "北榄", "ja": "サムットプラーカーン県", "de": "Samut Prakan"},
    "Chachoengsao": {"zh": "差春骚", "ja": "チャチューンサオ県", "de": "Chachoengsao"},
    "Chon Buri": {"zh": "春武里", "ja": "チョンブリー県", "de": "Chon Buri"},
    "Rayong": {"zh": "罗勇", "ja": "ラヨーン県", "de": "Rayong"},
    "Phuket": {"zh": "普吉", "ja": "プーケット県", "de": "Phuket"},
    "Khon Kaen": {"zh": "孔敬", "ja": "コーンケーン県", "de": "Khon Kaen"},
    "Sakon Nakhon": {"zh": "色军", "ja": "サコンナコーン県", "de": "Sakon Nakhon"},
    "Suphan Buri": {"zh": "素攀武里", "ja": "スパンブリー県", "de": "Suphan Buri"},
    "Sing Buri": {"zh": "信武里", "ja": "シンブリー県", "de": "Sing Buri"},
    "Chai Nat": {"zh": "猜纳", "ja": "チャイナート県", "de": "Chai Nat"},
    "Ang Thong": {"zh": "红统", "ja": "アーントーン県", "de": "Ang Thong"},
    "Saraburi": {"zh": "北标", "ja": "サラブリー県", "de": "Saraburi"},
    "Nakhon Ratchasima": {"zh": "呵叻", "ja": "ナコーンラーチャシーマー県", "de": "Nakhon Ratchasima"},
    "Nakhon Nayok": {"zh": "那空那育", "ja": "ナコーンナーヨック県", "de": "Nakhon Nayok"},
    "Pathum Thani": {"zh": "巴吞他尼", "ja": "パトゥムターニー県", "de": "Pathum Thani"},
    "Uthai Thani": {"zh": "乌泰他尼", "ja": "ウタイターニー県", "de": "Uthai Thani"},
    "Kalasin": {"zh": "加拉信", "ja": "カーラシン県", "de": "Kalasin"},
    "Roi Et": {"zh": "黎逸", "ja": "ローイエット県", "de": "Roi Et"},
    "Maha Sarakham": {"zh": "玛哈沙拉堪", "ja": "マハーサーラカーム県", "de": "Maha Sarakham"},
    "Nong Bua Lam Phu": {"zh": "廊磨喃蒲", "ja": "ノーンブワラムプー県", "de": "Nong Bua Lam Phu"},
    "Lop Buri": {"zh": "华富里", "ja": "ロッブリー県", "de": "Lop Buri"},
    "Udon Thani": {"zh": "乌隆他尼", "ja": "ウドーンターニー県", "de": "Udon Thani"},
    "Phra Nakhon Si Ayutthaya": {"zh": "大城", "ja": "プラナコーンシーアユッタヤー県", "de": "Ayutthaya"},
    "Nonthaburi": {"zh": "暖武里", "ja": "ノンタブリー県", "de": "Nonthaburi"},
    "Nakhon Pathom": {"zh": "佛统", "ja": "ナコーンパトム県", "de": "Nakhon Pathom"},
    "Kamphaeng Phet": {"zh": "甘烹碧", "ja": "カムペーンペット県", "de": "Kamphaeng Phet"},
    "Lampang": {"zh": "南邦", "ja": "ランパーン県", "de": "Lampang"},
    "Sukhothai": {"zh": "素可泰", "ja": "スコータイ県", "de": "Sukhothai"},
    "Nakhon Sawan": {"zh": "那空沙旺", "ja": "ナコーンサワン県", "de": "Nakhon Sawan"},
    "Phetchabun": {"zh": "碧差汶", "ja": "ペッチャブーン県", "de": "Phetchabun"},
    "Phichit": {"zh": "披集", "ja": "ピチット県", "de": "Phichit"},
    "Chaiyaphum": {"zh": "猜也奔", "ja": "チャイヤプーム県", "de": "Chaiyaphum"},
    "Phrae": {"zh": "帕", "ja": "プレー県", "de": "Phrae"},
    "Lamphun": {"zh": "南奔", "ja": "ラムプーン県", "de": "Lamphun"},
    "Prachin Buri": {"zh": "巴真武里", "ja": "プラーチーンブリー県", "de": "Prachin Buri"},
    "Yasothon": {"zh": "益梭通", "ja": "ヤソートーン県", "de": "Yasothon"},
}

INDIA_NAMES = {
    "Ladakh": {"zh": "拉达克", "ja": "ラダック", "de": "Ladakh"},
    "Arunachal Pradesh": {"zh": "阿鲁纳恰尔邦", "ja": "アルナーチャル・プラデーシュ州", "de": "Arunachal Pradesh"},
    "Sikkim": {"zh": "锡金", "ja": "シッキム州", "de": "Sikkim"},
    "West Bengal": {"zh": "西孟加拉", "ja": "西ベンガル州", "de": "Westbengalen"},
    "Assam": {"zh": "阿萨姆", "ja": "アッサム州", "de": "Assam"},
    "Uttarakhand": {"zh": "北阿坎德", "ja": "ウッタラーカンド州", "de": "Uttarakhand"},
    "Nagaland": {"zh": "那加兰", "ja": "ナガランド州", "de": "Nagaland"},
    "Manipur": {"zh": "曼尼普尔", "ja": "マニプル州", "de": "Manipur"},
    "Mizoram": {"zh": "米佐拉姆", "ja": "ミゾラム州", "de": "Mizoram"},
    "Tripura": {"zh": "特里普拉", "ja": "トリプラ州", "de": "Tripura"},
    "Meghalaya": {"zh": "梅加拉亚", "ja": "メーガーラヤ州", "de": "Meghalaya"},
    "Punjab": {"zh": "旁遮普", "ja": "パンジャーブ州", "de": "Punjab"},
    "Rajasthan": {"zh": "拉贾斯坦", "ja": "ラージャスターン州", "de": "Rajasthan"},
    "Gujarat": {"zh": "古吉拉特", "ja": "グジャラート州", "de": "Gujarat"},
    "Himachal Pradesh": {"zh": "喜马偕尔邦", "ja": "ヒマーチャル・プラデーシュ州", "de": "Himachal Pradesh"},
    "Jammu and Kashmir": {"zh": "查谟和克什米尔", "ja": "ジャンムー・カシミール", "de": "Jammu und Kashmir"},
    "Bihar": {"zh": "比哈尔", "ja": "ビハール州", "de": "Bihar"},
    "Uttar Pradesh": {"zh": "北方邦", "ja": "ウッタル・プラデーシュ州", "de": "Uttar Pradesh"},
    "Andhra Pradesh": {"zh": "安得拉邦", "ja": "アーンドラ・プラデーシュ州", "de": "Andhra Pradesh"},
    "Odisha": {"zh": "奥里萨", "ja": "オディシャ州", "de": "Odisha"},
    "Dadra and Nagar Haveli and Daman and Diu": {"zh": "达德拉-纳加尔哈维利和达曼-第乌", "ja": "ダードラー及びナガル・ハヴェーリー及びダマン及びディーウ", "de": "Dadra und Nagar Haveli und Daman und Diu"},
    "Maharashtra": {"zh": "马哈拉施特拉", "ja": "マハーラーシュトラ州", "de": "Maharashtra"},
    "Goa": {"zh": "果阿", "ja": "ゴア州", "de": "Goa"},
    "Karnataka": {"zh": "卡纳塔克", "ja": "カルナータカ州", "de": "Karnataka"},
    "Kerala": {"zh": "喀拉拉", "ja": "ケーララ州", "de": "Kerala"},
    "Puducherry": {"zh": "本地治里", "ja": "ポンディシェリ", "de": "Puducherry"},
    "Tamil Nadu": {"zh": "泰米尔纳德", "ja": "タミル・ナードゥ州", "de": "Tamil Nadu"},
    "Lakshadweep": {"zh": "拉克沙群岛", "ja": "ラクシャディープ諸島", "de": "Lakshadweep"},
    "Andaman and Nicobar": {"zh": "安达曼-尼科巴群岛", "ja": "アンダマン・ニコバル諸島", "de": "Andamanen und Nikobaren"},
    "Jharkhand": {"zh": "贾坎德", "ja": "ジャールカンド州", "de": "Jharkhand"},
    "Delhi": {"zh": "德里", "ja": "デリー", "de": "Delhi"},
    "Chandigarh": {"zh": "昌迪加尔", "ja": "チャンディーガル", "de": "Chandigarh"},
    "Madhya Pradesh": {"zh": "中央邦", "ja": "マディヤ・プラデーシュ州", "de": "Madhya Pradesh"},
    "Chhattisgarh": {"zh": "恰蒂斯加尔", "ja": "チャッティースガル州", "de": "Chhattisgarh"},
    "Haryana": {"zh": "哈里亚纳", "ja": "ハリヤーナー州", "de": "Haryana"},
    "Telangana": {"zh": "特伦甘纳", "ja": "テランガーナ州", "de": "Telangana"},
}

# fmt: on


def patch_translations(filepath: str, translations: dict) -> None:
    """补全 GeoJSON 文件中缺失的翻译。"""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    patched = 0
    for feat in data["features"]:
        props = feat["properties"]
        # key 可能是 name（中文）或 name_en（英文）
        en_name = props.get("name_en", "")
        zh_name = props.get("name", "")

        # 查英文名翻译
        trans = translations.get(en_name) or translations.get(zh_name)
        if not trans:
            continue

        if "zh" in trans and props["name"] == en_name:
            props["name"] = trans["zh"]
            patched += 1
        if "ja" in trans:
            props["name_ja"] = trans["ja"]
        if "de" in trans:
            props["name_de"] = trans["de"]
        if "en" in trans:
            props["name_en"] = trans["en"]

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    name = os.path.basename(filepath)
    print(f"  {name}: {patched} names patched")


def main() -> None:
    """补全所有缺失翻译。"""
    MISC = {
        "australia.json": {
            "Macquarie Island": {"zh": "麦夸里岛", "ja": "マッコーリー島", "de": "Macquarieinsel"},
            "Lord Howe Island": {"zh": "豪勋爵岛", "ja": "ロードハウ島", "de": "Lord-Howe-Insel"},
        },
        "france.json": {
            "Provence-Alpes-Côte-d'Azur": {"zh": "普罗旺斯-阿尔卑斯-蓝色海岸", "ja": "プロヴァンス＝アルプ＝コート・ダジュール", "de": "Provence-Alpes-Côte d'Azur"},
        },
        "italy.json": {
            "Apulia": {"zh": "普利亚", "ja": "プッリャ", "de": "Apulien"},
            "Sicily": {"zh": "西西里", "ja": "シチリア", "de": "Sizilien"},
        },
        "netherlands.json": {
            "Bonaire": {"zh": "博奈尔", "ja": "ボネール", "de": "Bonaire"},
            "St. Eustatius": {"zh": "圣尤斯特歇斯", "ja": "シント・ユースタティウス", "de": "Sint Eustatius"},
            "Saba": {"zh": "萨巴", "ja": "サバ", "de": "Saba"},
        },
        "new_zealand.json": {
            "Auckland Islands": {"zh": "奥克兰群岛", "ja": "オークランド諸島", "de": "Aucklandinseln"},
            "Campbell Islands": {"zh": "坎贝尔岛", "ja": "キャンベル島", "de": "Campbellinsel"},
            "Antipodes Islands": {"zh": "安蒂波德斯群岛", "ja": "アンティポデス諸島", "de": "Antipodeninseln"},
            "Chatham Islands Territory": {"zh": "查塔姆群岛", "ja": "チャタム諸島", "de": "Chathaminseln"},
            "Kermadec Islands": {"zh": "克马德克群岛", "ja": "ケルマデック諸島", "de": "Kermadecinseln"},
            "Tokelau": {"zh": "托克劳", "ja": "トケラウ", "de": "Tokelau"},
            "The Snares": {"zh": "斯奈尔斯群岛", "ja": "スネアーズ諸島", "de": "Snares"},
            "Marlborough District": {"zh": "马尔堡", "ja": "マールボロ地区", "de": "Marlborough"},
            "Nelson City": {"zh": "尼尔森", "ja": "ネルソン", "de": "Nelson"},
            "Tasman District": {"zh": "塔斯曼", "ja": "タスマン地区", "de": "Tasman"},
            "Gisborne District": {"zh": "吉斯伯恩", "ja": "ギズボーン地区", "de": "Gisborne"},
            "Three Kings Islands": {"zh": "三王群岛", "ja": "スリーキングス諸島", "de": "Dreikönigsinseln"},
        },
        "spain.json": {
            "Foral de Navarra": {"zh": "纳瓦拉", "ja": "ナバラ", "de": "Navarra"},
            "Valenciana": {"zh": "巴伦西亚", "ja": "バレンシア", "de": "Valencia"},
            "Murcia": {"zh": "穆尔西亚", "ja": "ムルシア", "de": "Murcia"},
            "Canary Is.": {"zh": "加那利群岛", "ja": "カナリア諸島", "de": "Kanarische Inseln"},
            "Madrid": {"zh": "马德里", "ja": "マドリード", "de": "Madrid"},
        },
        "switzerland.json": {
            "Lucerne": {"zh": "卢塞恩", "ja": "ルツェルン", "de": "Luzern"},
        },
        "world.json": {
            "Aland": {"zh": "奥兰群岛", "ja": "オーランド諸島", "de": "Åland"},
        },
    }

    print("Patching missing translations...")

    patch_translations(os.path.join(GEO_DIR, "russia.json"), RUSSIA_NAMES)
    patch_translations(os.path.join(GEO_DIR, "thailand.json"), THAILAND_NAMES)
    patch_translations(os.path.join(GEO_DIR, "india.json"), INDIA_NAMES)

    for filename, trans in MISC.items():
        patch_translations(os.path.join(GEO_DIR, filename), trans)

    print("Done!")


if __name__ == "__main__":
    main()
