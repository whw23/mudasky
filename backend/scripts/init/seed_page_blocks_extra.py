"""页面模组种子数据（续）。

出国留学、签证、申请条件、留学生活、新闻页面的区块数据。
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


def build_study_abroad_blocks() -> list[dict]:
    """出国留学页面区块。"""
    return [
        _block(
            "intro",
            section_tag="Study Abroad",
            section_title={"zh": "多国留学项目", "en": "Multi-Country Study Programs", "ja": "多国留学プログラム", "de": "Mehrländer-Studienprogramme"},
            data={
                "title": {"zh": "多国留学项目", "en": "Multi-Country Study Programs", "ja": "多国留学プログラム", "de": "Mehrländer-Studienprogramme"},
                "content": {"zh": "慕大国际提供德国、日本、新加坡等多国留学服务。我们根据每位学生的学术背景、语言水平和职业规划，量身定制最适合的留学方案。无论你是高中毕业生还是大学在读，我们都有匹配的留学项目。", "en": "MUTU International offers study abroad services for Germany, Japan, Singapore, and more. We create customized study plans based on each student's academic background, language proficiency, and career goals. Whether you're a high school graduate or university student, we have matching programs for you.", "ja": "慕大国際はドイツ、日本、シンガポールなどの留学サービスを提供しています。各学生の学術背景、言語能力、キャリアプランに基づいて、最適な留学プランをカスタマイズします。高校卒業生でも大学生でも、マッチングプログラムがあります。", "de": "MUTU International bietet Studiendienstleistungen für Deutschland, Japan, Singapur und mehr. Wir erstellen maßgeschneiderte Studienpläne basierend auf akademischem Hintergrund, Sprachkenntnissen und Karrierezielen. Ob Abiturient oder Student, wir haben passende Programme."},
            },
        ),
        _block(
            "card_grid",
            section_tag="Programs",
            section_title={"zh": "留学项目", "en": "Study Programs", "ja": "留学プログラム", "de": "Studienprogramme"},
            options={"cardType": "program"},
            data=[
                {
                    "featured": True,
                    "name": {"zh": "慕尼黑大学语言中心直通项目", "en": "Munich University Language Center Direct Program", "ja": "ミュンヘン大学言語センター直接プログラム", "de": "Direktprogramm des Sprachenzentrums der LMU München"},
                    "country": {"zh": "德国", "en": "Germany", "ja": "ドイツ", "de": "Deutschland"},
                    "desc": {"zh": "依托慕尼黑大学语言中心官方合作关系，为学生提供从德语学习到入读德国名校的完整通道。该项目是我们的核心优势项目，已成功帮助数百名学生进入德国顶尖大学。", "en": "Leveraging our official partnership with the Munich University Language Center, we provide students with a complete pathway from German language learning to enrollment at prestigious German universities. This is our core program and has helped hundreds of students enter top German universities.", "ja": "ミュンヘン大学言語センターとの公式パートナーシップを活用し、ドイツ語学習からドイツの名門大学への入学までの完全な経路を学生に提供します。これは当社のコアプログラムであり、数百人の学生がドイツのトップ大学に入学するのを支援してきました。", "de": "Durch unsere offizielle Partnerschaft mit dem Sprachenzentrum der LMU München bieten wir Studenten einen vollständigen Weg vom Deutschlernen bis zur Einschreibung an renommierten deutschen Universitäten. Dies ist unser Kernprogramm und hat Hunderten von Studenten geholfen, an Top-Universitäten in Deutschland aufgenommen zu werden."},
                    "features": [
                        {"zh": "官方认证德语课程", "en": "Officially certified German courses", "ja": "公式認定ドイツ語コース", "de": "Offiziell zertifizierte Deutschkurse"},
                        {"zh": "小班制精品教学", "en": "Small class premium instruction", "ja": "少人数制プレミアム指導", "de": "Kleingruppen-Premium-Unterricht"},
                        {"zh": "慕尼黑大学语言等级考试", "en": "Munich University language level exams", "ja": "ミュンヘン大学言語レベル試験", "de": "Sprachniveauprüfungen der LMU München"},
                        {"zh": "德国名校申请指导", "en": "German university application guidance", "ja": "ドイツ名門大学出願指導", "de": "Beratung für Bewerbungen an deutschen Spitzenuniversitäten"},
                        {"zh": "签证全程代办", "en": "Full visa processing service", "ja": "ビザ手続き全面サポート", "de": "Vollständiger Visumsbearbeitungsservice"},
                        {"zh": "境外接机安排", "en": "Airport pickup arrangement", "ja": "空港ピックアップ手配", "de": "Flughafenabholungsvereinbarung"},
                    ],
                },
                {
                    "featured": False,
                    "name": {"zh": "德国留学", "en": "Study in Germany", "ja": "ドイツ留学", "de": "Studium in Deutschland"},
                    "country": {"zh": "德国", "en": "Germany", "ja": "ドイツ", "de": "Deutschland"},
                    "desc": {"zh": "享受免学费的世界一流教育，工科、商科、医学等专业全球领先。德国留学性价比极高，毕业后就业前景广阔。", "en": "Enjoy world-class tuition-free education with globally leading programs in engineering, business, and medicine. Studying in Germany offers excellent value and broad career prospects after graduation.", "ja": "授業料無料の世界一流の教育を受け、工学、ビジネス、医学などの専攻が世界をリードしています。ドイツ留学は非常にコストパフォーマンスが高く、卒業後のキャリア見通しも広いです。", "de": "Genießen Sie erstklassige kostenlose Bildung mit weltweit führenden Programmen in Ingenieurwesen, Wirtschaft und Medizin. Ein Studium in Deutschland bietet hervorragendes Preis-Leistungs-Verhältnis und breite Karriereperspektiven nach dem Abschluss."},
                    "features": [
                        {"zh": "公立大学免学费", "en": "Tuition-free public universities", "ja": "公立大学授業料無料", "de": "Studiengebührenfreie öffentliche Universitäten"},
                        {"zh": "工程与技术专业全球领先", "en": "World-leading engineering programs", "ja": "工学・技術専攻が世界トップ", "de": "Weltweit führende Ingenieurprogramme"},
                        {"zh": "18个月毕业后求职签证", "en": "18-month post-graduation job-seeking visa", "ja": "卒業後18ヶ月の求職ビザ", "de": "18-monatiges Visum zur Arbeitssuche nach Abschluss"},
                        {"zh": "申根区自由通行", "en": "Free movement in Schengen area", "ja": "シェンゲン圏内自由移動", "de": "Freizügigkeit im Schengen-Raum"},
                    ],
                },
                {
                    "featured": False,
                    "name": {"zh": "日本留学", "en": "Study in Japan", "ja": "日本留学", "de": "Studium in Japan"},
                    "country": {"zh": "日本", "en": "Japan", "ja": "日本", "de": "Japan"},
                    "desc": {"zh": "亚洲顶尖教育体系，丰富的奖学金机会，文化体验独特。适合对日语和日本文化有浓厚兴趣的学生。", "en": "Asia's top education system with abundant scholarship opportunities and unique cultural experiences. Ideal for students interested in Japanese language and culture.", "ja": "アジアトップの教育システムで、豊富な奨学金の機会と独特の文化体験があります。日本語と日本文化に強い関心を持つ学生に最適です。", "de": "Asiens führendes Bildungssystem mit reichlich Stipendienmöglichkeiten und einzigartigen kulturellen Erfahrungen. Ideal für Studenten, die sich für japanische Sprache und Kultur interessieren."},
                    "features": [
                        {"zh": "丰富的奖学金项目", "en": "Abundant scholarship programs", "ja": "豊富な奨学金プログラム", "de": "Reichlich Stipendienprogramme"},
                        {"zh": "动漫、设计等特色专业", "en": "Unique programs in animation, design, etc.", "ja": "アニメ、デザインなどの特色ある専攻", "de": "Einzigartige Programme in Animation, Design usw."},
                        {"zh": "勤工俭学机会丰富", "en": "Part-time work opportunities", "ja": "アルバイトの機会が豊富", "de": "Teilzeitarbeitsmöglichkeiten"},
                    ],
                },
                {
                    "featured": False,
                    "name": {"zh": "新加坡留学", "en": "Study in Singapore", "ja": "シンガポール留学", "de": "Studium in Singapur"},
                    "country": {"zh": "新加坡", "en": "Singapore", "ja": "シンガポール", "de": "Singapur"},
                    "desc": {"zh": "亚洲顶尖教育体系，双语教学环境（英语+中文），全球金融与科技中心。治安优良，适合追求高质量英语授课教育的学生。", "en": "Asia's top education system with a bilingual environment (English + Chinese) and a global finance and tech hub. Excellent safety, ideal for students seeking high-quality English-taught education.", "ja": "アジアトップの教育システムで、バイリンガル環境（英語+中国語）、グローバルな金融・テクノロジーハブです。治安が良く、高品質な英語教育を求める学生に最適です。", "de": "Asiens Spitzenbildungssystem mit zweisprachiger Umgebung (Englisch + Chinesisch) und globalem Finanz- und Technologiezentrum. Hervorragende Sicherheit, ideal für Studenten, die hochwertige englischsprachige Bildung suchen."},
                    "features": [
                        {"zh": "英语+中文双语环境", "en": "English + Chinese bilingual environment", "ja": "英語+中国語のバイリンガル環境", "de": "Englisch + Chinesisch zweisprachige Umgebung"},
                        {"zh": "全球顶尖大学（NUS、NTU）", "en": "World-class universities (NUS, NTU)", "ja": "世界トップクラスの大学（NUS、NTU）", "de": "Weltklasse-Universitäten (NUS, NTU)"},
                        {"zh": "毕业后就业前景广阔", "en": "Broad career prospects after graduation", "ja": "卒業後のキャリア展望が広い", "de": "Breite Karriereperspektiven nach dem Abschluss"},
                    ],
                },
            ],
        ),
        _block(
            "article_list",
            show_title=False,
            options={"categorySlug": "study-abroad"},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {"zh": "选择最适合你的留学项目", "en": "Choose the Right Program for You", "ja": "あなたに最適な留学プログラムを選ぼう", "de": "Wählen Sie das richtige Programm für Sie"},
                "desc": {"zh": "每个学生都是独特的，我们帮你找到最匹配的留学方案", "en": "Every student is unique — let us help you find the best matching study abroad plan", "ja": "すべての学生はユニークです。最適な留学プランを見つけるお手伝いをします", "de": "Jeder Student ist einzigartig — wir helfen Ihnen, den besten Studienplan zu finden"},
            },
        ),
    ]


def build_visa_blocks() -> list[dict]:
    """签证办理页面区块。"""
    return [
        _block(
            "step_list",
            section_tag="Visa Process",
            section_title={"zh": "签证办理流程", "en": "Visa Process", "ja": "ビザ手続きの流れ", "de": "Visaverfahren"},
            data=[
                {"title": {"zh": "材料评估", "en": "Document Assessment", "ja": "書類評価", "de": "Dokumentenbewertung"}, "desc": {"zh": "签证顾问评估学生情况，制定签证材料准备方案，梳理所需文件清单。", "en": "Visa consultant assesses the student's situation, creates a visa document preparation plan, and outlines required documents.", "ja": "ビザコンサルタントが学生の状況を評価し、ビザ書類準備計画を作成し、必要な書類リストを整理します。", "de": "Visumberater bewertet die Situation des Studenten, erstellt einen Visadokumentvorbereitungsplan und skizziert erforderliche Dokumente."}},
                {"title": {"zh": "材料准备", "en": "Document Preparation", "ja": "書類準備", "de": "Dokumentenvorbereitung"}, "desc": {"zh": "协助学生准备签证所需材料，包括翻译、公证、认证等环节。", "en": "Assistance with preparing all visa-required materials, including translation, notarization, and authentication.", "ja": "翻訳、公証、認証などを含むすべてのビザ必要書類の準備を支援します。", "de": "Unterstützung bei der Vorbereitung aller visumserforderlichen Materialien, einschließlich Übersetzung, Beglaubigung und Authentifizierung."}},
                {"title": {"zh": "表格填写", "en": "Form Completion", "ja": "フォーム記入", "de": "Formularausfüllung"}, "desc": {"zh": "指导填写签证申请表格，确保信息准确无误，避免常见填写错误。", "en": "Guidance on filling out visa application forms, ensuring accuracy and avoiding common mistakes.", "ja": "ビザ申請フォームの記入を指導し、正確性を確保し、よくある間違いを避けます。", "de": "Anleitung zum Ausfüllen von Visaantragsformularen, um Genauigkeit zu gewährleisten und häufige Fehler zu vermeiden."}},
                {"title": {"zh": "预约递签", "en": "Appointment & Submission", "ja": "予約と提出", "de": "Termin & Einreichung"}, "desc": {"zh": "预约签证中心或使馆面签时间，进行面签模拟培训。", "en": "Booking visa center or embassy interview appointments, with mock interview training.", "ja": "ビザセンターまたは大使館の面接予約を行い、模擬面接トレーニングを実施します。", "de": "Buchung von Visumszentrum- oder Botschaftsinterviewterminen mit Scheininterviewtraining."}},
                {"title": {"zh": "结果跟踪", "en": "Progress Tracking", "ja": "進捗追跡", "de": "Fortschrittsverfolgung"}, "desc": {"zh": "提交签证申请后跟踪进度，及时处理补充材料要求。", "en": "Tracking visa application progress after submission, promptly handling supplementary material requests.", "ja": "提出後のビザ申請の進捗を追跡し、追加書類要求に迅速に対応します。", "de": "Verfolgung des Visaantragsfortschritts nach der Einreichung, prompte Bearbeitung zusätzlicher Materialanforderungen."}},
            ],
        ),
        _block(
            "doc_list",
            section_tag="Required Documents",
            section_title={"zh": "所需材料", "en": "Required Documents", "ja": "必要書類", "de": "Erforderliche Dokumente"},
            options={"iconName": "FileText"},
            data=[
                {"text": {"zh": "有效护照原件及复印件", "en": "Valid passport original and copies", "ja": "有効なパスポート原本とコピー", "de": "Gültiger Reisepass Original und Kopien"}},
                {"text": {"zh": "签证申请表", "en": "Visa application form", "ja": "ビザ申請フォーム", "de": "Visaantragsformular"}},
                {"text": {"zh": "证件照（符合使馆规格）", "en": "Passport photos (embassy specifications)", "ja": "証明写真（大使館規格に準拠）", "de": "Passfotos (Botschaftsspezifikationen)"}},
                {"text": {"zh": "大学录取通知书", "en": "University admission letter", "ja": "大学入学許可書", "de": "Universitätszulassungsschreiben"}},
                {"text": {"zh": "资金证明 / 经济担保", "en": "Proof of finances / financial guarantee", "ja": "資金証明 / 経済保証", "de": "Finanznachweis / Finanzgarantie"}},
                {"text": {"zh": "保险证明", "en": "Insurance certificate", "ja": "保険証明書", "de": "Versicherungszertifikat"}},
                {"text": {"zh": "语言证书", "en": "Language certificate", "ja": "語学証明書", "de": "Sprachzertifikat"}},
                {"text": {"zh": "学历认证文件", "en": "Academic credential verification", "ja": "学歴認証書類", "de": "Akademische Anerkennungsdokumente"}},
            ],
        ),
        _block(
            "card_grid",
            section_tag="Timeline",
            section_title={"zh": "办理周期", "en": "Processing Timeline", "ja": "処理スケジュール", "de": "Bearbeitungszeitplan"},
            options={"cardType": "timeline"},
            data=[
                {"title": {"zh": "材料准备", "en": "Document Preparation", "ja": "書類準備", "de": "Dokumentenvorbereitung"}, "time": {"zh": "2-4周", "en": "2-4 weeks", "ja": "2-4週間", "de": "2-4 Wochen"}, "desc": {"zh": "根据个人情况准备并审核签证材料", "en": "Prepare and review visa materials based on individual circumstances", "ja": "個人の状況に基づいてビザ書類を準備し審査します", "de": "Vorbereitung und Überprüfung von Visumsunterlagen basierend auf individuellen Umständen"}},
                {"title": {"zh": "签证审批", "en": "Visa Review", "ja": "ビザ審査", "de": "Visumsprüfung"}, "time": {"zh": "4-8周", "en": "4-8 weeks", "ja": "4-8週間", "de": "4-8 Wochen"}, "desc": {"zh": "使馆审核签证申请，期间可能补充材料", "en": "Embassy reviews the application; additional materials may be requested", "ja": "大使館が申請を審査し、期間中に追加書類が要求される場合があります", "de": "Botschaft prüft den Antrag; zusätzliche Materialien können angefordert werden"}},
                {"title": {"zh": "总体周期", "en": "Total Timeline", "ja": "全体スケジュール", "de": "Gesamtzeitplan"}, "time": {"zh": "6-12周", "en": "6-12 weeks", "ja": "6-12週間", "de": "6-12 Wochen"}, "desc": {"zh": "建议提前3个月开始准备签证", "en": "Recommend starting visa preparation at least 3 months in advance", "ja": "少なくとも3か月前にビザ準備を開始することをお勧めします", "de": "Empfehlung: mindestens 3 Monate im Voraus mit der Visumsbeantragung beginnen"}},
            ],
        ),
        _block(
            "doc_list",
            section_tag="Tips",
            section_title={"zh": "注意事项", "en": "Important Tips", "ja": "注意事項", "de": "Wichtige Tipps"},
            options={"iconName": "AlertTriangle"},
            data=[
                {"text": {"zh": "务必提前至少3个月开始准备签证材料，避免时间紧张影响入学。", "en": "Start preparing visa materials at least 3 months in advance to avoid time pressure affecting enrollment.", "ja": "入学に影響を与える時間的プレッシャーを避けるため、少なくとも3か月前にビザ書類の準備を開始してください。", "de": "Beginnen Sie mindestens 3 Monate im Voraus mit der Vorbereitung der Visumsunterlagen, um Zeitdruck zu vermeiden."}},
                {"text": {"zh": "资金证明金额需满足目标国家的最低要求，德国目前为每年10,332欧元。", "en": "Financial proof must meet the target country's minimum requirements; Germany currently requires €10,332 per year.", "ja": "資金証明額は対象国の最低要件を満たす必要があり、ドイツは現在年間10,332ユーロです。", "de": "Der Finanznachweis muss die Mindestanforderungen des Ziellandes erfüllen; Deutschland verlangt derzeit 10.332 € pro Jahr."}},
                {"text": {"zh": "所有非中文和非英文的材料需要经过公证翻译，建议选择正规翻译机构。", "en": "All non-Chinese and non-English documents need certified translation; use reputable translation agencies.", "ja": "すべての非中国語および非英語の書類は公証翻訳が必要です。評判の良い翻訳機関を選択してください。", "de": "Alle nicht-chinesischen und nicht-englischen Dokumente benötigen beglaubigte Übersetzungen; nutzen Sie seriöse Übersetzungsbüros."}},
                {"text": {"zh": "面签时保持自信、回答真实，不要背诵答案，注意着装得体。", "en": "Stay confident during the interview, answer honestly, don't memorize answers, and dress appropriately.", "ja": "面接時は自信を持ち、正直に答え、答えを暗記せず、適切な服装に注意してください。", "de": "Bleiben Sie während des Interviews selbstbewusst, antworten Sie ehrlich, memorieren Sie keine Antworten und kleiden Sie sich angemessen."}},
                {"text": {"zh": "保留所有申请材料的副本和电子版，以备使馆要求补充材料。", "en": "Keep copies and digital versions of all application materials in case the embassy requests supplements.", "ja": "大使館が補足資料を要求した場合に備えて、すべての申請書類のコピーと電子版を保管してください。", "de": "Bewahren Sie Kopien und digitale Versionen aller Antragsunterlagen auf, falls die Botschaft Ergänzungen anfordert."}},
            ],
        ),
        _block(
            "article_list",
            show_title=False,
            options={"categorySlug": "visa"},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {"zh": "签证问题？交给我们", "en": "Visa Questions? Leave It to Us", "ja": "ビザの質問？お任せください", "de": "Visafragen? Überlassen Sie es uns"},
                "desc": {"zh": "98%的签证通过率，专业签证团队为你保驾护航", "en": "98% visa approval rate — our professional visa team ensures your success", "ja": "98%のビザ承認率 - プロフェッショナルなビザチームが成功を保証します", "de": "98% Visumserfolgrate — unser professionelles Visumsoteam sichert Ihren Erfolg"},
            },
        ),
    ]


def build_requirements_blocks() -> list[dict]:
    """申请条件页面区块。"""
    return [
        _block(
            "card_grid",
            section_tag="Country Requirements",
            section_title={"zh": "各国申请条件", "en": "Country Requirements", "ja": "各国の申請条件", "de": "Länderanforderungen"},
            options={"cardType": "checklist"},
            data=[
                {"country": {"zh": "德国留学", "en": "Study in Germany", "ja": "ドイツ留学", "de": "Studium in Deutschland"}, "items": [{"zh": "高中毕业或同等学历（211/985院校优先）", "en": "High school diploma or equivalent (211/985 universities preferred)", "ja": "高校卒業または同等の学歴（211/985大学優先）", "de": "Abitur oder gleichwertig (211/985-Universitäten bevorzugt)"}, {"zh": "德语B1以上或英语雅思6.0以上", "en": "German B1+ or English IELTS 6.0+", "ja": "ドイツ語B1以上または英語IELTS 6.0以上", "de": "Deutsch B1+ oder Englisch IELTS 6.0+"}, {"zh": "APS审核证书", "en": "APS verification certificate", "ja": "APS審査証明書", "de": "APS-Zertifikat"}, {"zh": "资金证明（约10,332欧元/年）", "en": "Proof of finances (approx. €10,332/year)", "ja": "資金証明（約10,332ユーロ/年）", "de": "Finanznachweis (ca. 10.332 €/Jahr)"}]},
                {"country": {"zh": "日本留学", "en": "Study in Japan", "ja": "日本留学", "de": "Studium in Japan"}, "items": [{"zh": "12年及以上教育经历", "en": "12+ years of education", "ja": "12年以上の教育歴", "de": "12+ Jahre Bildung"}, {"zh": "日语N2以上或EJU成绩", "en": "JLPT N2+ or EJU score", "ja": "日本語能力試験N2以上またはEJUスコア", "de": "JLPT N2+ oder EJU-Punktzahl"}, {"zh": "经费支付能力证明", "en": "Proof of financial support", "ja": "経費支払能力証明", "de": "Nachweis finanzieller Unterstützung"}]},
                {"country": {"zh": "新加坡留学", "en": "Study in Singapore", "ja": "シンガポール留学", "de": "Studium in Singapur"}, "items": [{"zh": "高中及以上学历", "en": "High school diploma or above", "ja": "高校以上の学歴", "de": "Abitur oder höher"}, {"zh": "雅思6.0以上或托福80以上", "en": "IELTS 6.0+ or TOEFL 80+", "ja": "IELTS 6.0以上またはTOEFL 80以上", "de": "IELTS 6.0+ oder TOEFL 80+"}, {"zh": "资金担保证明", "en": "Financial guarantee certificate", "ja": "資金保証証明書", "de": "Finanzgarantiezertifikat"}]},
            ],
        ),
        _block(
            "card_grid",
            section_tag="Language Requirements",
            section_title={"zh": "语言要求", "en": "Language Requirements", "ja": "語学要件", "de": "Sprachanforderungen"},
            options={"cardType": "checklist"},
            data=[
                {"language": {"zh": "德语等级要求", "en": "German Language Requirements", "ja": "ドイツ語レベル要件", "de": "Deutschsprachanforderungen"}, "items": [{"zh": "大多数德语授课项目要求德福（TestDaF）4x4或DSH-2。预科项目通常要求B1水平。我们与慕尼黑大学语言中心合作，提供从零基础到B2的完整德语培训课程。", "en": "Most German-taught programs require TestDaF 4x4 or DSH-2. Foundation programs typically require B1 level. We partner with the Munich University Language Center to offer complete German training courses from beginner to B2.", "ja": "ほとんどのドイツ語で教える科目はTestDaF 4x4またはDSH-2を必要とします。予備コースは通常B1レベルを必要とします。私たちはミュンヘン大学言語センターと提携し、初心者からB2までの完全なドイツ語トレーニングコースを提供しています。", "de": "Die meisten deutschsprachigen Programme erfordern TestDaF 4x4 oder DSH-2. Studienvorbereitung erfordert in der Regel B1-Niveau. Wir arbeiten mit dem Sprachenzentrum der LMU München zusammen und bieten komplette Deutschkurse von Anfänger bis B2."}]},
                {"language": {"zh": "日语等级要求", "en": "Japanese Language Requirements", "ja": "日本語レベル要件", "de": "Japanischsprachanforderungen"}, "items": [{"zh": "语言学校通常要求N5-N4水平，本科直申需要N2以上，研究生申请建议N1水平。我们提供配套的日语培训和考试辅导服务。", "en": "Language schools typically require N5-N4 level, direct undergraduate applications need N2+, and graduate applications recommend N1 level. We offer supplementary Japanese training and exam preparation.", "ja": "語学学校は通常N5-N4レベルを必要とし、学部への直接出願にはN2以上が必要で、大学院出願にはN1レベルを推奨します。私たちは補完的な日本語トレーニングと試験準備を提供しています。", "de": "Sprachschulen erfordern in der Regel N5-N4-Niveau, direkte Bachelor-Bewerbungen benötigen N2+ und Master-Bewerbungen empfehlen N1-Niveau. Wir bieten ergänzendes Japanisch-Training und Prüfungsvorbereitung."}]},
            ],
        ),
        _block(
            "doc_list",
            section_tag="Documents",
            section_title={"zh": "申请材料清单", "en": "Application Documents", "ja": "申請書類一覧", "de": "Bewerbungsunterlagen"},
            data=[
                {"text": {"zh": "护照（有效期6个月以上）", "en": "Valid passport (6+ months validity)", "ja": "パスポート（有効期限6ヶ月以上）", "de": "Gültiger Reisepass (6+ Monate gültig)"}},
                {"text": {"zh": "学历证明及成绩单", "en": "Academic certificates and transcripts", "ja": "学歴証明書と成績証明書", "de": "Akademische Zeugnisse und Abschriften"}},
                {"text": {"zh": "语言等级证书", "en": "Language proficiency certificate", "ja": "語学レベル証明書", "de": "Sprachkompetenzzertifikat"}},
                {"text": {"zh": "个人陈述 / 动机信", "en": "Personal statement / motivation letter", "ja": "個人声明書 / モチベーションレター", "de": "Persönliche Erklärung / Motivationsschreiben"}},
                {"text": {"zh": "推荐信（2封）", "en": "Letters of recommendation (2)", "ja": "推薦状（2通）", "de": "Empfehlungsschreiben (2)"}},
                {"text": {"zh": "资金证明", "en": "Proof of finances", "ja": "資金証明", "de": "Finanznachweis"}},
                {"text": {"zh": "APS审核证书（德国）", "en": "APS verification certificate (Germany)", "ja": "APS審査証明書（ドイツ）", "de": "APS-Zertifikat (Deutschland)"}},
                {"text": {"zh": "证件照", "en": "Passport photos", "ja": "証明写真", "de": "Passfotos"}},
            ],
        ),
        _block(
            "step_list",
            section_tag="Application Steps",
            section_title={"zh": "申请流程", "en": "Application Process", "ja": "申請プロセス", "de": "Bewerbungsprozess"},
            data=[
                {"title": {"zh": "免费咨询评估", "en": "Free Consultation & Assessment", "ja": "無料相談・評価", "de": "Kostenlose Beratung & Bewertung"}, "desc": {"zh": "专业顾问一对一评估学生背景，制定个性化留学方案。", "en": "One-on-one professional assessment of student background with customized study abroad plans.", "ja": "専門のコンサルタントが学生の背景を一対一で評価し、個別の留学プランを作成します。", "de": "Eins-zu-eins-professionelle Bewertung des Schülerhintergrunds mit maßgeschneiderten Studienplänen."}},
                {"title": {"zh": "语言培训", "en": "Language Training", "ja": "語学トレーニング", "de": "Sprachtraining"}, "desc": {"zh": "根据目标院校要求，进行针对性语言培训和考试辅导。", "en": "Targeted language training and exam preparation based on university requirements.", "ja": "大学の要件に基づいて、対象を絞った語学トレーニングと試験準備を行います。", "de": "Gezielte Sprachtraining und Prüfungsvorbereitung basierend auf Universitätsanforderungen."}},
                {"title": {"zh": "材料准备", "en": "Document Preparation", "ja": "資料準備", "de": "Dokumentenvorbereitung"}, "desc": {"zh": "协助准备申请材料，确保材料完整、规范、高质量。", "en": "Assistance in preparing application materials, ensuring completeness, accuracy, and quality.", "ja": "申請資料の準備を支援し、完全性、正確性、品質を確保します。", "de": "Unterstützung bei der Vorbereitung von Bewerbungsunterlagen, um Vollständigkeit, Genauigkeit und Qualität zu gewährleisten."}},
                {"title": {"zh": "院校申请", "en": "University Application", "ja": "大学出願", "de": "Universitätsbewerbung"}, "desc": {"zh": "提交院校申请，跟进申请进度，及时处理补充材料。", "en": "Submit university applications, track progress, and handle supplementary materials promptly.", "ja": "大学の申請を提出し、進捗を追跡し、補足資料を迅速に処理します。", "de": "Universitätsbewerbungen einreichen, Fortschritt verfolgen und ergänzende Materialien rechtzeitig bearbeiten."}},
                {"title": {"zh": "签证办理", "en": "Visa Processing", "ja": "ビザ手続き", "de": "Visumsbearbeitung"}, "desc": {"zh": "获得录取后协助办理签证，准备签证材料，预约面签。", "en": "Visa assistance after admission, including document preparation and interview scheduling.", "ja": "入学後のビザ支援、資料準備、面接予約を含みます。", "de": "Visumsunterstützung nach Zulassung, einschließlich Dokumentenvorbereitung und Terminplanung."}},
                {"title": {"zh": "行前指导", "en": "Pre-departure Guidance", "ja": "出発前ガイダンス", "de": "Vorabfahrtberatung"}, "desc": {"zh": "提供行前培训、购票指导、接机安排等全方位服务。", "en": "Pre-departure training, flight booking guidance, airport pickup arrangements, and more.", "ja": "出発前トレーニング、航空券予約ガイダンス、空港ピックアップ手配などを提供します。", "de": "Vorabfahrttraining, Flugbuchungsberatung, Flughafenabholungsvereinbarungen und mehr."}},
            ],
        ),
        _block(
            "article_list",
            show_title=False,
            options={"categorySlug": "requirements"},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {"zh": "不确定自己是否符合条件？", "en": "Unsure If You Qualify?", "ja": "資格があるかどうかわかりませんか？", "de": "Unsicher, ob Sie qualifiziert sind?"},
                "desc": {"zh": "我们提供免费的背景评估服务，帮你了解最适合的留学方向", "en": "We offer free background assessments to help you find the best study abroad direction", "ja": "無料のバックグラウンド評価サービスを提供し、最適な留学方向を見つけるお手伝いをします", "de": "Wir bieten kostenlose Hintergrundprüfungen, um Ihnen die beste Studienrichtung zu finden"},
            },
        ),
    ]
