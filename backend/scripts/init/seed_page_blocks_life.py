"""页面模组种子数据（留学生活 + 新闻）。

留学生活和新闻页面的区块数据。
"""

from uuid import uuid4


def _block(
    block_type: str,
    *,
    show_title: bool = True,
    section_tag: str = "",
    section_title=None,
    bg_color: str = "white",
    options: dict | None = None,
    data=None,
) -> dict:
    """构造一个标准 Block 字典。"""
    return {
        "id": str(uuid4()),
        "type": block_type,
        "showTitle": show_title,
        "sectionTag": section_tag,
        "sectionTitle": section_title or "",
        "bgColor": bg_color,
        "options": options or {},
        "data": data,
    }


def build_life_blocks() -> list[dict]:
    """留学生活页面区块。"""
    return [
        _block(
            "intro",
            section_tag="Living Guide",
            section_title={"zh": "留学生活指南", "en": "Study Abroad Living Guide", "ja": "留学生活ガイド", "de": "Studienführer für das Leben im Ausland"},
            data={
                "title": {"zh": "留学生活指南", "en": "Study Abroad Living Guide", "ja": "留学生活ガイド", "de": "Studienführer für das Leben im Ausland"},
                "content": {"zh": "踏上留学之旅，不仅是学术的深造，更是人生的历练。了解目标国家的生活方方面面，让你的留学生活更加顺利和丰富。我们整理了详细的生活指南，帮助你快速融入海外生活。", "en": "Embarking on your study abroad journey is not just about academic growth — it's a life-changing experience. Understanding all aspects of life in your destination country will make your study abroad experience smoother and richer. We've compiled a detailed living guide to help you quickly adapt to life overseas.", "ja": "留学の旅に出ることは、学術的な成長だけでなく、人生を変える体験です。目的地の国の生活のあらゆる側面を理解することで、留学体験がよりスムーズで豊かになります。海外生活に迅速に適応するための詳細な生活ガイドをまとめました。", "de": "Ihre Studienreise ist nicht nur akademisches Wachstum — es ist eine lebensverändernde Erfahrung. Das Verständnis aller Aspekte des Lebens in Ihrem Zielland macht Ihre Studienerfahrung reibungsloser und reicher. Wir haben einen detaillierten Lebensführer zusammengestellt, um Ihnen zu helfen, sich schnell ans Leben im Ausland anzupassen."},
            },
        ),
        _block(
            "card_grid",
            section_tag="Life Guide",
            section_title={"zh": "生活指南", "en": "Life Guide", "ja": "生活ガイド", "de": "Lebensführer"},
            bg_color="gray",
            options={"cardType": "guide"},
            data=[
                {
                    "icon": "home",
                    "title": {"zh": "住宿安排", "en": "Accommodation", "ja": "宿泊手配", "de": "Unterkunft"},
                    "desc": {"zh": "在德国，留学生可以选择学生宿舍（Studentenwohnheim）、合租公寓（WG）或单独租房。学生宿舍价格最低，约250-400欧元/月，但名额有限需提前申请。合租公寓是最受欢迎的选择，月租约350-600欧元。我们会协助学生在出发前安排好住宿。", "en": "In Germany, international students can choose student dormitories (Studentenwohnheim), shared apartments (WG), or private rentals. Student dormitories are the most affordable at around €250-400/month but have limited availability. Shared apartments are the most popular choice at about €350-600/month. We help students arrange accommodation before departure.", "ja": "ドイツでは、留学生は学生寮（Studentenwohnheim）、シェアアパート（WG）、または個人賃貸を選択できます。学生寮は月額約250-400ユーロで最も手頃ですが、空きが限られているため事前申請が必要です。シェアアパートは月額約350-600ユーロで最も人気のある選択肢です。私たちは出発前に学生の宿泊を手配するのを支援します。", "de": "In Deutschland können internationale Studenten zwischen Studentenwohnheimen, Wohngemeinschaften (WG) oder privaten Mietwohnungen wählen. Studentenwohnheime sind am günstigsten (ca. 250-400 €/Monat), haben aber begrenzte Verfügbarkeit. WGs sind die beliebteste Wahl (ca. 350-600 €/Monat). Wir helfen Studenten, vor der Abreise eine Unterkunft zu organisieren."},
                },
                {
                    "icon": "bus",
                    "title": {"zh": "交通出行", "en": "Transportation", "ja": "交通", "de": "Verkehr"},
                    "desc": {"zh": "德国公共交通系统发达，留学生可购买学期票（Semesterticket），覆盖所在城市及周边地区的公交、地铁和区域火车。此外，德铁（DB）提供多种优惠票价，BahnCard 25/50可享受相应折扣。骑自行车也是德国学生的主要出行方式。", "en": "Germany has an excellent public transportation system. Students can purchase a semester ticket (Semesterticket) covering local buses, metros, and regional trains. Deutsche Bahn (DB) offers various discount fares, and BahnCard 25/50 provides corresponding discounts. Cycling is also a primary mode of transport for German students.", "ja": "ドイツには優れた公共交通システムがあります。学生は学期チケット（Semesterticket）を購入して、地元のバス、地下鉄、地域列車をカバーできます。ドイツ鉄道（DB）はさまざまな割引運賃を提供し、BahnCard 25/50は対応する割引を提供します。サイクリングはドイツの学生の主要な移動手段でもあります。", "de": "Deutschland verfügt über ein hervorragendes öffentliches Verkehrssystem. Studenten können ein Semesterticket kaufen, das lokale Busse, U-Bahnen und Regionalzüge abdeckt. Die Deutsche Bahn (DB) bietet verschiedene ermäßigte Tarife, und BahnCard 25/50 bietet entsprechende Rabatte. Radfahren ist auch ein Hauptverkehrsmittel für deutsche Studenten."},
                },
                {
                    "icon": "utensils-crossed",
                    "title": {"zh": "饮食文化", "en": "Food & Dining", "ja": "食事文化", "de": "Essen & Kultur"},
                    "desc": {"zh": "德国大学食堂（Mensa）提供经济实惠的餐食，一顿饭约2-5欧元。超市如Aldi、Lidl、REWE等选择丰富，自己做饭每月食品支出约200-300欧元。亚洲超市也越来越多，可以买到中国食材。德国啤酒和面包种类繁多，值得尝试。", "en": "German university cafeterias (Mensa) offer affordable meals at about €2-5 each. Supermarkets like Aldi, Lidl, and REWE offer diverse options; cooking at home costs about €200-300/month for groceries. Asian supermarkets are increasingly available for Chinese ingredients. Germany's beer and bread varieties are worth exploring.", "ja": "ドイツの大学食堂（Mensa）は、1食約2-5ユーロで手頃な食事を提供しています。Aldi、Lidl、REWEなどのスーパーマーケットは多様な選択肢を提供しており、自炊すると月額約200-300ユーロの食品費がかかります。アジア系スーパーマーケットも増えており、中国の食材を購入できます。ドイツのビールとパンの種類は探索する価値があります。", "de": "Deutsche Universitätskafeterien (Mensa) bieten erschwingliche Mahlzeiten für ca. 2-5 € pro Mahlzeit. Supermärkte wie Aldi, Lidl und REWE bieten vielfältige Optionen; Selbstkochen kostet ca. 200-300 €/Monat für Lebensmittel. Asiatische Supermärkte sind zunehmend verfügbar für chinesische Zutaten. Deutschlands Bier- und Brotsorten sind es wert, erkundet zu werden."},
                },
                {
                    "icon": "palette",
                    "title": {"zh": "文化适应", "en": "Cultural Adaptation", "ja": "文化適応", "de": "Kulturelle Anpassung"},
                    "desc": {"zh": "德国人注重守时和规则，初期适应可能需要时间。大学通常有国际学生服务中心和丰富的社团活动，是结交朋友和融入当地文化的好渠道。德国的博物馆、剧院和音乐会非常丰富，很多对学生提供免费或优惠票价。", "en": "Germans value punctuality and following rules, which may take time to adjust to. Universities typically have international student service centers and diverse student organizations — great channels for making friends and integrating into local culture. Germany's museums, theaters, and concerts are abundant, with many offering free or discounted tickets for students.", "ja": "ドイツ人は時間厳守とルールを重視しており、適応には時間がかかる場合があります。大学には通常、留学生サービスセンターと多様な学生組織があり、友達を作り、地元文化に統合するための素晴らしいチャネルです。ドイツの博物館、劇場、コンサートは豊富で、多くが学生に無料または割引チケットを提供しています。", "de": "Deutsche legen Wert auf Pünktlichkeit und Regelbefolgung, was Zeit zur Anpassung erfordern kann. Universitäten haben in der Regel internationale Studentenservicezentren und vielfältige Studentenorganisationen — großartige Kanäle, um Freunde zu finden und sich in die lokale Kultur zu integrieren. Deutschlands Museen, Theater und Konzerte sind reichlich vorhanden, viele bieten kostenlose oder ermäßigte Tickets für Studenten."},
                },
            ],
        ),
        _block(
            "card_grid",
            section_tag="Popular Cities",
            section_title={"zh": "热门留学城市", "en": "Popular Cities", "ja": "人気の留学都市", "de": "Beliebte Studienstädte"},
            options={"cardType": "city"},
            data=[
                {
                    "city": {"zh": "慕尼黑", "en": "Munich", "ja": "ミュンヘン", "de": "München"},
                    "country": {"zh": "德国", "en": "Germany", "ja": "ドイツ", "de": "Deutschland"},
                    "desc": {"zh": "巴伐利亚州首府，德国第三大城市。高科技产业聚集，宝马、西门子等总部所在地。生活品质高，啤酒花园文化享誉世界。", "en": "Capital of Bavaria and Germany's third-largest city. Home to major tech companies like BMW and Siemens. High quality of life with world-famous beer garden culture.", "ja": "バイエルン州の州都で、ドイツ第3の都市。BMW、シーメンスなど主要なテック企業の本社があります。生活の質が高く、世界的に有名なビアガーデン文化があります。", "de": "Hauptstadt Bayerns und Deutschlands drittgrößte Stadt. Heimat großer Technologieunternehmen wie BMW und Siemens. Hohe Lebensqualität mit weltberühmter Biergartenkultur."},
                    "image_id": "",
                },
                {
                    "city": {"zh": "柏林", "en": "Berlin", "ja": "ベルリン", "de": "Berlin"},
                    "country": {"zh": "德国", "en": "Germany", "ja": "ドイツ", "de": "Deutschland"},
                    "desc": {"zh": "德国首都，欧洲最具活力的城市之一。文化多元、艺术氛围浓厚，生活成本在德国大城市中相对较低。创业生态活跃。", "en": "Germany's capital and one of Europe's most vibrant cities. Culturally diverse with a strong arts scene, relatively lower living costs among major German cities. Active startup ecosystem.", "ja": "ドイツの首都であり、ヨーロッパで最も活気のある都市の1つ。文化的に多様で、芸術シーンが強く、ドイツの主要都市の中で比較的低い生活費。活発なスタートアップエコシステム。", "de": "Deutschlands Hauptstadt und eine der lebendigsten Städte Europas. Kulturell vielfältig mit starker Kunstszene, relativ niedrigere Lebenshaltungskosten unter den großen deutschen Städten. Aktives Startup-Ökosystem."},
                    "image_id": "",
                },
                {
                    "city": {"zh": "汉堡", "en": "Hamburg", "ja": "ハンブルク", "de": "Hamburg"},
                    "country": {"zh": "德国", "en": "Germany", "ja": "ドイツ", "de": "Deutschland"},
                    "desc": {"zh": "德国第二大城市，重要港口城市。媒体和航空产业发达，城市绿化优美，生活质量极高。拥有著名的易北音乐厅。", "en": "Germany's second-largest city and major port. Thriving media and aviation industries, beautiful green spaces, and extremely high quality of life. Home to the famous Elbphilharmonie.", "ja": "ドイツ第2の都市であり、主要な港湾都市。メディアと航空産業が盛んで、美しい緑地と非常に高い生活の質。有名なエルプフィルハーモニーがあります。", "de": "Deutschlands zweitgrößte Stadt und wichtiger Hafen. Blühende Medien- und Luftfahrtindustrie, wunderschöne Grünflächen und extrem hohe Lebensqualität. Heimat der berühmten Elbphilharmonie."},
                    "image_id": "",
                },
            ],
        ),
        _block(
            "article_list",
            show_title=False,
            options={"categorySlug": "life"},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {"zh": "想了解更多留学生活？", "en": "Want to Learn More About Life Abroad?", "ja": "海外生活についてもっと知りたいですか？", "de": "Möchten Sie mehr über das Leben im Ausland erfahren?"},
                "desc": {"zh": "预约咨询，我们的海归顾问为你分享真实的留学生活经验", "en": "Book a consultation — our overseas-experienced consultants will share real study abroad experiences", "ja": "相談を予約してください - 海外経験のあるコンサルタントが実際の留学体験を共有します", "de": "Buchen Sie eine Beratung — unsere im Ausland erfahrenen Berater teilen echte Studienerfahrungen"},
            },
        ),
    ]


def build_news_blocks() -> list[dict]:
    """新闻政策页面区块。"""
    return [
        _block(
            "article_list",
            show_title=False,
            options={"categorySlug": "news"},
        ),
    ]
