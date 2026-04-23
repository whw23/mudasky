"""初始化系统配置。

从环境变量读取联系方式等配置，不硬编码敏感信息。
"""

import logging
import os

from sqlalchemy import select

from app.db.config.models import SystemConfig

logger = logging.getLogger(__name__)

# 系统配置定义：(key, description, value_factory)
CONFIGS = [
    (
        "site_info",
        "网站基本信息",
        lambda: {
            "brand_name": {
                "zh": "慕大国际教育",
                "en": "Muda International Education",
                "ja": "慕大国際教育",
                "de": "Muda Internationale Bildung",
            },
            "tagline": {
                "zh": "专注国际教育 · 专注出国服务",
                "en": "International Education · Study Abroad Services",
                "ja": "国際教育に専念 · 留学サービスに専念",
                "de": "Internationale Bildung · Auslandsstudium",
            },
            "hotline": "189-1268-6656",
            "hotline_contact": {
                "zh": "苏老师",
                "en": "Ms. Su",
                "ja": "蘇さん",
                "de": "Frau Su",
            },
            "company_name": "浩然学行(苏州)文化传播有限公司",
            "icp_filing": "苏ICP备2022046719号-1",
            # 首页关于我们介绍
            "home_intro_title": {
                "zh": "关于我们",
                "en": "About Us",
                "ja": "私たちについて",
                "de": "Über uns",
            },
            "home_intro_content": {
                "zh": "慕大国际从事小语种留学项目运营已15年，为慕尼黑大学语言中心江苏省唯一指定招生考点。慕尼黑大学语言中心是官方德语培训基地考点。我们致力于为学生提供全方位的留学咨询、院校申请、签证办理等一站式服务。",
                "en": "MUTU International has been operating foreign language study abroad programs for 15 years and is the only designated enrollment center for the Munich University Language Center in Jiangsu Province. We are committed to providing students with comprehensive one-stop services including study abroad consulting, university applications, and visa processing.",
                "ja": "慕大国際は小言語留学プログラムの運営を15年間行っており、ミュンヘン大学言語センターの江蘇省唯一の指定募集拠点です。ミュンヘン大学言語センターは公式のドイツ語トレーニング基地試験センターです。私たちは学生に留学コンサルティング、大学出願、ビザ申請などのワンストップサービスを提供することに専念しています。",
                "de": "MUTU International betreibt seit 15 Jahren Fremdsprachenstudien-Programme und ist das einzige offizielle Anmeldezentrum des Sprachenzentrums der Ludwig-Maximilians-Universität München in der Provinz Jiangsu. Wir bieten umfassende Dienstleistungen wie Studienberatung, Universitätsbewerbungen und Visabearbeitung.",
            },
            # 首页 CTA
            "home_cta_title": {
                "zh": "开启你的留学之旅",
                "en": "Start Your Study Abroad Journey",
                "ja": "留学の旅を始めよう",
                "de": "Beginnen Sie Ihre Studienreise",
            },
            "home_cta_desc": {
                "zh": "15年专注国际教育，为你提供最专业的留学咨询服务",
                "en": "15 years of dedication to international education, providing you with the most professional study abroad consulting services",
                "ja": "15年間国際教育に専念し、最もプロフェッショナルな留学コンサルティングサービスを提供します",
                "de": "15 Jahre internationale Bildung, professionelle Studienberatung",
            },
            # 关于我们页面 CTA
            "about_cta_title": {
                "zh": "开启你的留学之旅",
                "en": "Start Your Study Abroad Journey",
                "ja": "留学の旅を始めよう",
                "de": "Beginnen Sie Ihre Studienreise",
            },
            "about_cta_desc": {
                "zh": "专业团队为你量身定制留学方案，从选校到签证全程陪伴",
                "en": "Our professional team creates customized study abroad plans, accompanying you from school selection to visa processing",
                "ja": "プロフェッショナルチームがあなたのためにカスタマイズされた留学プランを作成し、学校選択からビザ取得まで全力でサポートします",
                "de": "Unser professionelles Team erstellt maßgeschneiderte Studienpläne und begleitet Sie von der Schulauswahl bis zur Visabearbeitung",
            },
            # 关于我们 - 办公室图片
            "about_cards": [
                {
                    "icon": "Award",
                    "title": {"zh": "我们的使命", "en": "Our Mission", "ja": "私たちの使命", "de": "Unsere Mission"},
                    "desc": {"zh": "让每一位留学梦想的学子都能获得专业、贴心的一站式留学服务，帮助学生找到最适合自己的海外学府，实现人生价值的飞跃。", "en": "To provide every student with professional, personalized one-stop study abroad services.", "ja": "すべての留学を夢見る学生に専門的で心のこもったワンストップ留学サービスを提供すること。", "de": "Jedem Studenten einen professionellen, personalisierten Studienberatungsservice aus einer Hand zu bieten."},
                },
                {
                    "icon": "Globe",
                    "title": {"zh": "我们的愿景", "en": "Our Vision", "ja": "私たちのビジョン", "de": "Unsere Vision"},
                    "desc": {"zh": "成为中国最值得信赖的国际教育服务品牌，打通中国学子与世界名校之间的桥梁，推动中外教育文化交流与融合。", "en": "To become China's most trusted international education brand, bridging Chinese students and world-class universities.", "ja": "中国で最も信頼される国際教育サービスブランドとなること。", "de": "Die vertrauenswürdigste internationale Bildungsmarke Chinas zu werden."},
                },
            ],
            "about_office_images": [],
            # 院校选择页面
            "universities_intro_title": {
                "zh": "精选合作院校",
                "en": "Selected Partner Universities",
                "ja": "選定パートナー大学",
                "de": "Ausgewählte Partneruniversitäten",
            },
            "universities_intro_desc": {
                "zh": "我们与德国多所知名大学建立了深度合作关系，为学生提供更便捷的申请通道和更高的录取成功率。以下是部分合作院校，涵盖综合性大学、理工大学和应用科学大学。",
                "en": "We have established deep partnerships with numerous prestigious German universities, providing students with more convenient application channels and higher admission success rates. Below are some of our partner institutions, covering comprehensive universities, technical universities, and universities of applied sciences.",
                "ja": "ドイツの多くの有名大学と深い協力関係を築き、学生により便利な出願チャネルと高い合格率を提供しています。以下は一部の協力大学で、総合大学、工科大学、応用科学大学を含みます。",
                "de": "Wir haben tiefe Partnerschaften mit zahlreichen renommierten deutschen Universitäten aufgebaut und bieten Studenten bequemere Bewerbungskanäle und höhere Zulassungsraten. Nachfolgend sind einige unserer Partnerinstitutionen aufgeführt, darunter umfassende Universitäten, technische Universitäten und Fachhochschulen.",
            },
            "universities_cta_title": {
                "zh": "找到适合你的留学院校",
                "en": "Find Your Perfect University",
                "ja": "あなたにぴったりの大学を見つけよう",
                "de": "Finden Sie Ihre perfekte Universität",
            },
            "universities_cta_desc": {
                "zh": "我们提供免费的背景评估服务，帮你了解最适合的留学方向",
                "en": "We offer free background assessments to help you find the best study abroad direction",
                "ja": "無料のバックグラウンド評価サービスを提供し、最適な留学方向を見つけるお手伝いをします",
                "de": "Wir bieten kostenlose Hintergrundprüfungen, um Ihnen die beste Studienrichtung zu finden",
            },
            # 成功案例页面
            "cases_intro_title": {
                "zh": "学生成功故事",
                "en": "Student Success Stories",
                "ja": "学生成功ストーリー",
                "de": "Studentische Erfolgsgeschichten",
            },
            "cases_intro_desc": {
                "zh": "每一个成功的留学故事都始于一次专业的咨询",
                "en": "Every successful study abroad story begins with a professional consultation",
                "ja": "すべての成功した留学物語はプロフェッショナルな相談から始まります",
                "de": "Jede erfolgreiche Studiengeschichte beginnt mit einer professionellen Beratung",
            },
            "cases_cta_title": {
                "zh": "你也可以成为下一个成功案例",
                "en": "You Could Be Our Next Success Story",
                "ja": "あなたも次の成功事例になれる",
                "de": "Sie könnten unsere nächste Erfolgsgeschichte sein",
            },
            "cases_cta_desc": {
                "zh": "每一个成功的留学故事都始于一次专业的咨询",
                "en": "Every successful study abroad story begins with a professional consultation",
                "ja": "すべての成功した留学物語はプロフェッショナルな相談から始まります",
                "de": "Jede erfolgreiche Studiengeschichte beginnt mit einer professionellen Beratung",
            },
            # 出国留学页面
            "study_abroad_intro_title": {
                "zh": "多国留学项目",
                "en": "Multi-Country Study Programs",
                "ja": "多国留学プログラム",
                "de": "Mehrländer-Studienprogramme",
            },
            "study_abroad_intro_desc": {
                "zh": "慕大国际提供德国、日本、新加坡等多国留学服务。我们根据每位学生的学术背景、语言水平和职业规划，量身定制最适合的留学方案。无论你是高中毕业生还是大学在读，我们都有匹配的留学项目。",
                "en": "MUTU International offers study abroad services for Germany, Japan, Singapore, and more. We create customized study plans based on each student's academic background, language proficiency, and career goals. Whether you're a high school graduate or university student, we have matching programs for you.",
                "ja": "慕大国際はドイツ、日本、シンガポールなどの留学サービスを提供しています。各学生の学術背景、言語能力、キャリアプランに基づいて、最適な留学プランをカスタマイズします。高校卒業生でも大学生でも、マッチングプログラムがあります。",
                "de": "MUTU International bietet Studiendienstleistungen für Deutschland, Japan, Singapur und mehr. Wir erstellen maßgeschneiderte Studienpläne basierend auf akademischem Hintergrund, Sprachkenntnissen und Karrierezielen. Ob Abiturient oder Student, wir haben passende Programme.",
            },
            "study_abroad_cta_title": {
                "zh": "选择最适合你的留学项目",
                "en": "Choose the Right Program for You",
                "ja": "あなたに最適な留学プログラムを選ぼう",
                "de": "Wählen Sie das richtige Programm für Sie",
            },
            "study_abroad_cta_desc": {
                "zh": "每个学生都是独特的，我们帮你找到最匹配的留学方案",
                "en": "Every student is unique — let us help you find the best matching study abroad plan",
                "ja": "すべての学生はユニークです。最適な留学プランを見つけるお手伝いをします",
                "de": "Jeder Student ist einzigartig — wir helfen Ihnen, den besten Studienplan zu finden",
            },
            "study_abroad_programs": [
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
            # 签证办理页面
            "visa_process_steps": [
                {
                    "title": {
                        "zh": "材料评估",
                        "en": "Document Assessment",
                        "ja": "書類評価",
                        "de": "Dokumentenbewertung",
                    },
                    "desc": {
                        "zh": "签证顾问评估学生情况，制定签证材料准备方案，梳理所需文件清单。",
                        "en": "Visa consultant assesses the student's situation, creates a visa document preparation plan, and outlines required documents.",
                        "ja": "ビザコンサルタントが学生の状況を評価し、ビザ書類準備計画を作成し、必要な書類リストを整理します。",
                        "de": "Visumberater bewertet die Situation des Studenten, erstellt einen Visadokumentvorbereitungsplan und skizziert erforderliche Dokumente.",
                    },
                },
                {
                    "title": {
                        "zh": "材料准备",
                        "en": "Document Preparation",
                        "ja": "書類準備",
                        "de": "Dokumentenvorbereitung",
                    },
                    "desc": {
                        "zh": "协助学生准备签证所需材料，包括翻译、公证、认证等环节。",
                        "en": "Assistance with preparing all visa-required materials, including translation, notarization, and authentication.",
                        "ja": "翻訳、公証、認証などを含むすべてのビザ必要書類の準備を支援します。",
                        "de": "Unterstützung bei der Vorbereitung aller visumserforderlichen Materialien, einschließlich Übersetzung, Beglaubigung und Authentifizierung.",
                    },
                },
                {
                    "title": {
                        "zh": "表格填写",
                        "en": "Form Completion",
                        "ja": "フォーム記入",
                        "de": "Formularausfüllung",
                    },
                    "desc": {
                        "zh": "指导填写签证申请表格，确保信息准确无误，避免常见填写错误。",
                        "en": "Guidance on filling out visa application forms, ensuring accuracy and avoiding common mistakes.",
                        "ja": "ビザ申請フォームの記入を指導し、正確性を確保し、よくある間違いを避けます。",
                        "de": "Anleitung zum Ausfüllen von Visaantragsformularen, um Genauigkeit zu gewährleisten und häufige Fehler zu vermeiden.",
                    },
                },
                {
                    "title": {
                        "zh": "预约递签",
                        "en": "Appointment & Submission",
                        "ja": "予約と提出",
                        "de": "Termin & Einreichung",
                    },
                    "desc": {
                        "zh": "预约签证中心或使馆面签时间，进行面签模拟培训。",
                        "en": "Booking visa center or embassy interview appointments, with mock interview training.",
                        "ja": "ビザセンターまたは大使館の面接予約を行い、模擬面接トレーニングを実施します。",
                        "de": "Buchung von Visumszentrum- oder Botschaftsinterviewterminen mit Scheininterviewtraining.",
                    },
                },
                {
                    "title": {
                        "zh": "结果跟踪",
                        "en": "Progress Tracking",
                        "ja": "進捗追跡",
                        "de": "Fortschrittsverfolgung",
                    },
                    "desc": {
                        "zh": "提交签证申请后跟踪进度，及时处理补充材料要求。",
                        "en": "Tracking visa application progress after submission, promptly handling supplementary material requests.",
                        "ja": "提出後のビザ申請の進捗を追跡し、追加書類要求に迅速に対応します。",
                        "de": "Verfolgung des Visaantragsfortschritts nach der Einreichung, prompte Bearbeitung zusätzlicher Materialanforderungen.",
                    },
                },
            ],
            "visa_required_docs": [
                {"text": {"zh": "有效护照原件及复印件", "en": "Valid passport original and copies", "ja": "有効なパスポート原本とコピー", "de": "Gültiger Reisepass Original und Kopien"}},
                {"text": {"zh": "签证申请表", "en": "Visa application form", "ja": "ビザ申請フォーム", "de": "Visaantragsformular"}},
                {"text": {"zh": "证件照（符合使馆规格）", "en": "Passport photos (embassy specifications)", "ja": "証明写真（大使館規格に準拠）", "de": "Passfotos (Botschaftsspezifikationen)"}},
                {"text": {"zh": "大学录取通知书", "en": "University admission letter", "ja": "大学入学許可書", "de": "Universitätszulassungsschreiben"}},
                {"text": {"zh": "资金证明 / 经济担保", "en": "Proof of finances / financial guarantee", "ja": "資金証明 / 経済保証", "de": "Finanznachweis / Finanzgarantie"}},
                {"text": {"zh": "保险证明", "en": "Insurance certificate", "ja": "保険証明書", "de": "Versicherungszertifikat"}},
                {"text": {"zh": "语言证书", "en": "Language certificate", "ja": "語学証明書", "de": "Sprachzertifikat"}},
                {"text": {"zh": "学历认证文件", "en": "Academic credential verification", "ja": "学歴認証書類", "de": "Akademische Anerkennungsdokumente"}},
            ],
            "visa_timeline": [
                {
                    "title": {"zh": "材料准备", "en": "Document Preparation", "ja": "書類準備", "de": "Dokumentenvorbereitung"},
                    "time": {"zh": "2-4周", "en": "2-4 weeks", "ja": "2-4週間", "de": "2-4 Wochen"},
                    "desc": {"zh": "根据个人情况准备并审核签证材料", "en": "Prepare and review visa materials based on individual circumstances", "ja": "個人の状況に基づいてビザ書類を準備し審査します", "de": "Vorbereitung und Überprüfung von Visumsunterlagen basierend auf individuellen Umständen"},
                },
                {
                    "title": {"zh": "签证审批", "en": "Visa Review", "ja": "ビザ審査", "de": "Visumsprüfung"},
                    "time": {"zh": "4-8周", "en": "4-8 weeks", "ja": "4-8週間", "de": "4-8 Wochen"},
                    "desc": {"zh": "使馆审核签证申请，期间可能补充材料", "en": "Embassy reviews the application; additional materials may be requested", "ja": "大使館が申請を審査し、期間中に追加書類が要求される場合があります", "de": "Botschaft prüft den Antrag; zusätzliche Materialien können angefordert werden"},
                },
                {
                    "title": {"zh": "总体周期", "en": "Total Timeline", "ja": "全体スケジュール", "de": "Gesamtzeitplan"},
                    "time": {"zh": "6-12周", "en": "6-12 weeks", "ja": "6-12週間", "de": "6-12 Wochen"},
                    "desc": {"zh": "建议提前3个月开始准备签证", "en": "Recommend starting visa preparation at least 3 months in advance", "ja": "少なくとも3か月前にビザ準備を開始することをお勧めします", "de": "Empfehlung: mindestens 3 Monate im Voraus mit der Visumsbeantragung beginnen"},
                },
            ],
            "visa_tips": [
                {"text": {"zh": "务必提前至少3个月开始准备签证材料，避免时间紧张影响入学。", "en": "Start preparing visa materials at least 3 months in advance to avoid time pressure affecting enrollment.", "ja": "入学に影響を与える時間的プレッシャーを避けるため、少なくとも3か月前にビザ書類の準備を開始してください。", "de": "Beginnen Sie mindestens 3 Monate im Voraus mit der Vorbereitung der Visumsunterlagen, um Zeitdruck zu vermeiden."}},
                {"text": {"zh": "资金证明金额需满足目标国家的最低要求，德国目前为每年10,332欧元。", "en": "Financial proof must meet the target country's minimum requirements; Germany currently requires €10,332 per year.", "ja": "資金証明額は対象国の最低要件を満たす必要があり、ドイツは現在年間10,332ユーロです。", "de": "Der Finanznachweis muss die Mindestanforderungen des Ziellandes erfüllen; Deutschland verlangt derzeit 10.332 € pro Jahr."}},
                {"text": {"zh": "所有非中文和非英文的材料需要经过公证翻译，建议选择正规翻译机构。", "en": "All non-Chinese and non-English documents need certified translation; use reputable translation agencies.", "ja": "すべての非中国語および非英語の書類は公証翻訳が必要です。評判の良い翻訳機関を選択してください。", "de": "Alle nicht-chinesischen und nicht-englischen Dokumente benötigen beglaubigte Übersetzungen; nutzen Sie seriöse Übersetzungsbüros."}},
                {"text": {"zh": "面签时保持自信、回答真实，不要背诵答案，注意着装得体。", "en": "Stay confident during the interview, answer honestly, don't memorize answers, and dress appropriately.", "ja": "面接時は自信を持ち、正直に答え、答えを暗記せず、適切な服装に注意してください。", "de": "Bleiben Sie während des Interviews selbstbewusst, antworten Sie ehrlich, memorieren Sie keine Antworten und kleiden Sie sich angemessen."}},
                {"text": {"zh": "保留所有申请材料的副本和电子版，以备使馆要求补充材料。", "en": "Keep copies and digital versions of all application materials in case the embassy requests supplements.", "ja": "大使館が補足資料を要求した場合に備えて、すべての申請書類のコピーと電子版を保管してください。", "de": "Bewahren Sie Kopien und digitale Versionen aller Antragsunterlagen auf, falls die Botschaft Ergänzungen anfordert."}},
            ],
            "visa_cta_title": {
                "zh": "签证问题？交给我们",
                "en": "Visa Questions? Leave It to Us",
                "ja": "ビザの質問？お任せください",
                "de": "Visafragen? Überlassen Sie es uns",
            },
            "visa_cta_desc": {
                "zh": "98%的签证通过率，专业签证团队为你保驾护航",
                "en": "98% visa approval rate — our professional visa team ensures your success",
                "ja": "98%のビザ承認率 - プロフェッショナルなビザチームが成功を保証します",
                "de": "98% Visumserfolgrate — unser professionelles Visumsoteam sichert Ihren Erfolg",
            },
            # 申请条件页面
            "requirements_cta_title": {
                "zh": "不确定自己是否符合条件？",
                "en": "Unsure If You Qualify?",
                "ja": "資格があるかどうかわかりませんか？",
                "de": "Unsicher, ob Sie qualifiziert sind?",
            },
            "requirements_cta_desc": {
                "zh": "我们提供免费的背景评估服务，帮你了解最适合的留学方向",
                "en": "We offer free background assessments to help you find the best study abroad direction",
                "ja": "無料のバックグラウンド評価サービスを提供し、最適な留学方向を見つけるお手伝いをします",
                "de": "Wir bieten kostenlose Hintergrundprüfungen, um Ihnen die beste Studienrichtung zu finden",
            },
            "requirements_countries": [
                {
                    "country": {"zh": "德国留学", "en": "Study in Germany", "ja": "ドイツ留学", "de": "Studium in Deutschland"},
                    "items": [
                        {"zh": "高中毕业或同等学历（211/985院校优先）", "en": "High school diploma or equivalent (211/985 universities preferred)", "ja": "高校卒業または同等の学歴（211/985大学優先）", "de": "Abitur oder gleichwertig (211/985-Universitäten bevorzugt)"},
                        {"zh": "德语B1以上或英语雅思6.0以上", "en": "German B1+ or English IELTS 6.0+", "ja": "ドイツ語B1以上または英語IELTS 6.0以上", "de": "Deutsch B1+ oder Englisch IELTS 6.0+"},
                        {"zh": "APS审核证书", "en": "APS verification certificate", "ja": "APS審査証明書", "de": "APS-Zertifikat"},
                        {"zh": "资金证明（约10,332欧元/年）", "en": "Proof of finances (approx. €10,332/year)", "ja": "資金証明（約10,332ユーロ/年）", "de": "Finanznachweis (ca. 10.332 €/Jahr)"},
                    ],
                },
                {
                    "country": {"zh": "日本留学", "en": "Study in Japan", "ja": "日本留学", "de": "Studium in Japan"},
                    "items": [
                        {"zh": "12年及以上教育经历", "en": "12+ years of education", "ja": "12年以上の教育歴", "de": "12+ Jahre Bildung"},
                        {"zh": "日语N2以上或EJU成绩", "en": "JLPT N2+ or EJU score", "ja": "日本語能力試験N2以上またはEJUスコア", "de": "JLPT N2+ oder EJU-Punktzahl"},
                        {"zh": "经费支付能力证明", "en": "Proof of financial support", "ja": "経費支払能力証明", "de": "Nachweis finanzieller Unterstützung"},
                    ],
                },
                {
                    "country": {"zh": "新加坡留学", "en": "Study in Singapore", "ja": "シンガポール留学", "de": "Studium in Singapur"},
                    "items": [
                        {"zh": "高中及以上学历", "en": "High school diploma or above", "ja": "高校以上の学歴", "de": "Abitur oder höher"},
                        {"zh": "雅思6.0以上或托福80以上", "en": "IELTS 6.0+ or TOEFL 80+", "ja": "IELTS 6.0以上またはTOEFL 80以上", "de": "IELTS 6.0+ oder TOEFL 80+"},
                        {"zh": "资金担保证明", "en": "Financial guarantee certificate", "ja": "資金保証証明書", "de": "Finanzgarantiezertifikat"},
                    ],
                },
            ],
            "requirements_languages": [
                {
                    "language": {"zh": "德语等级要求", "en": "German Language Requirements", "ja": "ドイツ語レベル要件", "de": "Deutschsprachanforderungen"},
                    "items": [
                        {"zh": "大多数德语授课项目要求德福（TestDaF）4x4或DSH-2。预科项目通常要求B1水平。我们与慕尼黑大学语言中心合作，提供从零基础到B2的完整德语培训课程。", "en": "Most German-taught programs require TestDaF 4x4 or DSH-2. Foundation programs typically require B1 level. We partner with the Munich University Language Center to offer complete German training courses from beginner to B2.", "ja": "ほとんどのドイツ語で教える科目はTestDaF 4x4またはDSH-2を必要とします。予備コースは通常B1レベルを必要とします。私たちはミュンヘン大学言語センターと提携し、初心者からB2までの完全なドイツ語トレーニングコースを提供しています。", "de": "Die meisten deutschsprachigen Programme erfordern TestDaF 4x4 oder DSH-2. Studienvorbereitung erfordert in der Regel B1-Niveau. Wir arbeiten mit dem Sprachenzentrum der LMU München zusammen und bieten komplette Deutschkurse von Anfänger bis B2."},
                    ],
                },
                {
                    "language": {"zh": "日语等级要求", "en": "Japanese Language Requirements", "ja": "日本語レベル要件", "de": "Japanischsprachanforderungen"},
                    "items": [
                        {"zh": "语言学校通常要求N5-N4水平，本科直申需要N2以上，研究生申请建议N1水平。我们提供配套的日语培训和考试辅导服务。", "en": "Language schools typically require N5-N4 level, direct undergraduate applications need N2+, and graduate applications recommend N1 level. We offer supplementary Japanese training and exam preparation.", "ja": "語学学校は通常N5-N4レベルを必要とし、学部への直接出願にはN2以上が必要で、大学院出願にはN1レベルを推奨します。私たちは補完的な日本語トレーニングと試験準備を提供しています。", "de": "Sprachschulen erfordern in der Regel N5-N4-Niveau, direkte Bachelor-Bewerbungen benötigen N2+ und Master-Bewerbungen empfehlen N1-Niveau. Wir bieten ergänzendes Japanisch-Training und Prüfungsvorbereitung."},
                    ],
                },
            ],
            "requirements_docs": [
                {"text": {"zh": "护照（有效期6个月以上）", "en": "Valid passport (6+ months validity)", "ja": "パスポート（有効期限6ヶ月以上）", "de": "Gültiger Reisepass (6+ Monate gültig)"}},
                {"text": {"zh": "学历证明及成绩单", "en": "Academic certificates and transcripts", "ja": "学歴証明書と成績証明書", "de": "Akademische Zeugnisse und Abschriften"}},
                {"text": {"zh": "语言等级证书", "en": "Language proficiency certificate", "ja": "語学レベル証明書", "de": "Sprachkompetenzzertifikat"}},
                {"text": {"zh": "个人陈述 / 动机信", "en": "Personal statement / motivation letter", "ja": "個人声明書 / モチベーションレター", "de": "Persönliche Erklärung / Motivationsschreiben"}},
                {"text": {"zh": "推荐信（2封）", "en": "Letters of recommendation (2)", "ja": "推薦状（2通）", "de": "Empfehlungsschreiben (2)"}},
                {"text": {"zh": "资金证明", "en": "Proof of finances", "ja": "資金証明", "de": "Finanznachweis"}},
                {"text": {"zh": "APS审核证书（德国）", "en": "APS verification certificate (Germany)", "ja": "APS審査証明書（ドイツ）", "de": "APS-Zertifikat (Deutschland)"}},
                {"text": {"zh": "证件照", "en": "Passport photos", "ja": "証明写真", "de": "Passfotos"}},
            ],
            "requirements_steps": [
                {
                    "title": {"zh": "免费咨询评估", "en": "Free Consultation & Assessment", "ja": "無料相談・評価", "de": "Kostenlose Beratung & Bewertung"},
                    "desc": {"zh": "专业顾问一对一评估学生背景，制定个性化留学方案。", "en": "One-on-one professional assessment of student background with customized study abroad plans.", "ja": "専門のコンサルタントが学生の背景を一対一で評価し、個別の留学プランを作成します。", "de": "Eins-zu-eins-professionelle Bewertung des Schülerhintergrunds mit maßgeschneiderten Studienplänen."},
                },
                {
                    "title": {"zh": "语言培训", "en": "Language Training", "ja": "語学トレーニング", "de": "Sprachtraining"},
                    "desc": {"zh": "根据目标院校要求，进行针对性语言培训和考试辅导。", "en": "Targeted language training and exam preparation based on university requirements.", "ja": "大学の要件に基づいて、対象を絞った語学トレーニングと試験準備を行います。", "de": "Gezielte Sprachtraining und Prüfungsvorbereitung basierend auf Universitätsanforderungen."},
                },
                {
                    "title": {"zh": "材料准备", "en": "Document Preparation", "ja": "資料準備", "de": "Dokumentenvorbereitung"},
                    "desc": {"zh": "协助准备申请材料，确保材料完整、规范、高质量。", "en": "Assistance in preparing application materials, ensuring completeness, accuracy, and quality.", "ja": "申請資料の準備を支援し、完全性、正確性、品質を確保します。", "de": "Unterstützung bei der Vorbereitung von Bewerbungsunterlagen, um Vollständigkeit, Genauigkeit und Qualität zu gewährleisten."},
                },
                {
                    "title": {"zh": "院校申请", "en": "University Application", "ja": "大学出願", "de": "Universitätsbewerbung"},
                    "desc": {"zh": "提交院校申请，跟进申请进度，及时处理补充材料。", "en": "Submit university applications, track progress, and handle supplementary materials promptly.", "ja": "大学の申請を提出し、進捗を追跡し、補足資料を迅速に処理します。", "de": "Universitätsbewerbungen einreichen, Fortschritt verfolgen und ergänzende Materialien rechtzeitig bearbeiten."},
                },
                {
                    "title": {"zh": "签证办理", "en": "Visa Processing", "ja": "ビザ手続き", "de": "Visumsbearbeitung"},
                    "desc": {"zh": "获得录取后协助办理签证，准备签证材料，预约面签。", "en": "Visa assistance after admission, including document preparation and interview scheduling.", "ja": "入学後のビザ支援、資料準備、面接予約を含みます。", "de": "Visumsunterstützung nach Zulassung, einschließlich Dokumentenvorbereitung und Terminplanung."},
                },
                {
                    "title": {"zh": "行前指导", "en": "Pre-departure Guidance", "ja": "出発前ガイダンス", "de": "Vorabfahrtberatung"},
                    "desc": {"zh": "提供行前培训、购票指导、接机安排等全方位服务。", "en": "Pre-departure training, flight booking guidance, airport pickup arrangements, and more.", "ja": "出発前トレーニング、航空券予約ガイダンス、空港ピックアップ手配などを提供します。", "de": "Vorabfahrttraining, Flugbuchungsberatung, Flughafenabholungsvereinbarungen und mehr."},
                },
            ],
            # 留学生活页面
            "life_intro_title": {
                "zh": "留学生活指南",
                "en": "Study Abroad Living Guide",
                "ja": "留学生活ガイド",
                "de": "Studienführer für das Leben im Ausland",
            },
            "life_intro_desc": {
                "zh": "踏上留学之旅，不仅是学术的深造，更是人生的历练。了解目标国家的生活方方面面，让你的留学生活更加顺利和丰富。我们整理了详细的生活指南，帮助你快速融入海外生活。",
                "en": "Embarking on your study abroad journey is not just about academic growth — it's a life-changing experience. Understanding all aspects of life in your destination country will make your study abroad experience smoother and richer. We've compiled a detailed living guide to help you quickly adapt to life overseas.",
                "ja": "留学の旅に出ることは、学術的な成長だけでなく、人生を変える体験です。目的地の国の生活のあらゆる側面を理解することで、留学体験がよりスムーズで豊かになります。海外生活に迅速に適応するための詳細な生活ガイドをまとめました。",
                "de": "Ihre Studienreise ist nicht nur akademisches Wachstum — es ist eine lebensverändernde Erfahrung. Das Verständnis aller Aspekte des Lebens in Ihrem Zielland macht Ihre Studienerfahrung reibungsloser und reicher. Wir haben einen detaillierten Lebensführer zusammengestellt, um Ihnen zu helfen, sich schnell ans Leben im Ausland anzupassen.",
            },
            "life_cta_title": {
                "zh": "想了解更多留学生活？",
                "en": "Want to Learn More About Life Abroad?",
                "ja": "海外生活についてもっと知りたいですか？",
                "de": "Möchten Sie mehr über das Leben im Ausland erfahren?",
            },
            "life_cta_desc": {
                "zh": "预约咨询，我们的海归顾问为你分享真实的留学生活经验",
                "en": "Book a consultation — our overseas-experienced consultants will share real study abroad experiences",
                "ja": "相談を予約してください - 海外経験のあるコンサルタントが実際の留学体験を共有します",
                "de": "Buchen Sie eine Beratung — unsere im Ausland erfahrenen Berater teilen echte Studienerfahrungen",
            },
            "life_guide_cards": [
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
            "life_city_cards": [
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
        },
    ),
    (
        "phone_country_codes",
        "手机号国家码",
        lambda: [
            {"code": "+86", "country": "\U0001f1e8\U0001f1f3", "label": "\u4e2d\u56fd", "digits": 11, "enabled": True},
            {"code": "+1", "country": "\U0001f1fa\U0001f1f8", "label": "\u7f8e\u56fd", "digits": 10, "enabled": False},
            {"code": "+44", "country": "\U0001f1ec\U0001f1e7", "label": "\u82f1\u56fd", "digits": 10, "enabled": False},
            {"code": "+81", "country": "\U0001f1ef\U0001f1f5", "label": "\u65e5\u672c", "digits": 10, "enabled": False},
            {"code": "+49", "country": "\U0001f1e9\U0001f1ea", "label": "\u5fb7\u56fd", "digits": 11, "enabled": False},
        ],
    ),
    (
        "homepage_stats",
        "首页统计数据",
        lambda: [
            {"value": "15+", "label": "年办学经验"},
            {"value": "500+", "label": "成功案例"},
            {"value": "50+", "label": "合作院校"},
            {"value": "98%", "label": "签证通过率"},
        ],
    ),
    (
        "about_info",
        "关于我们",
        lambda: {
            "history_title": {
                "zh": "15年专注国际教育",
                "en": "15 Years of International Education",
                "ja": "国際教育に15年間専念",
                "de": "15 Jahre Internationale Bildung",
            },
            "history": {
                "zh": "慕大国际教育成立于2011年，专注于小语种留学项目运营已15年。作为慕尼黑大学语言中心江苏省唯一指定招生考点，我们始终秉承\"专业、诚信、高效\"的服务理念，为数百位学子成功圆梦海外名校。从最初的德语培训到如今涵盖德语、日语、英语等多语种留学服务，我们不断拓展业务版图，致力于成为中国领先的国际教育服务机构。",
                "en": "Founded in 2011, MUTU International Education has been dedicated to foreign language study abroad programs for 15 years. As the only designated enrollment center for the Munich University Language Center in Jiangsu Province, we have always upheld the service philosophy of \"professionalism, integrity, and efficiency\", helping hundreds of students achieve their dreams of studying at prestigious overseas universities.",
                "ja": "2011年設立、慕大国際教育は15年間小語種留学プロジェクトの運営に専念してきました。ミュンヘン大学言語センター江蘇省唯一の指定入試拠点として、「専門性、誠実さ、効率性」のサービス理念を堅持し、数百名の学生の海外名門大学進学をサポートしてきました。",
                "de": "MUTU International Education wurde 2011 gegründet und widmet sich seit 15 Jahren dem Betrieb von Fremdsprachen-Studienprogrammen im Ausland. Als einziger designierter Einschreibungsort des Sprachenzentrums der Ludwig-Maximilians-Universität München in der Provinz Jiangsu haben wir stets die Servicephilosophie \"Professionalität, Integrität und Effizienz\" hochgehalten.",
            },
            "mission": {
                "zh": "让每一位学子都能获得优质的国际教育资源，开启精彩的留学人生。",
                "en": "To provide every student with access to quality international education resources and an exciting study abroad experience.",
                "ja": "すべての学生に質の高い国際教育資源を提供し、素晴らしい留学生活を開くこと。",
                "de": "Jedem Studenten Zugang zu hochwertigen internationalen Bildungsressourcen zu ermöglichen.",
            },
            "vision": {
                "zh": "成为中国最受信赖的国际教育服务机构，架起中外教育交流的桥梁。",
                "en": "To become China's most trusted international education service provider, bridging educational exchanges between China and the world.",
                "ja": "中国で最も信頼される国際教育サービス機関となり、中外教育交流の架け橋となること。",
                "de": "Das vertrauenswürdigste internationale Bildungsdienstleistungsunternehmen Chinas zu werden.",
            },
            "partnership": "",
        },
    ),
    (
        "panel_pages",
        "面板页面配置",
        lambda: {
            "admin": [],
            "portal": [],
        },
    ),
    (
        "nav_config",
        "导航栏配置",
        lambda: {
            "order": [
                "home",
                "universities",
                "study-abroad",
                "requirements",
                "cases",
                "visa",
                "life",
                "news",
                "about",
            ],
            "custom_items": [],
        },
    ),
    (
        "page_banners",
        "页面 Banner 配置",
        lambda: {
            "home": {"image_ids": []},
            "universities": {"image_ids": []},
            "cases": {"image_ids": []},
            "study-abroad": {"image_ids": []},
            "requirements": {"image_ids": []},
            "visa": {"image_ids": []},
            "life": {"image_ids": []},
            "news": {"image_ids": []},
            "about": {"image_ids": []},
        },
    ),
    (
        "contact_info",
        "联系方式",
        lambda: {
            "address": os.environ.get(
                "CONTACT_ADDRESS", ""
            ),
            "phone": os.environ.get(
                "CONTACT_PHONE", ""
            ),
            "email": os.environ.get(
                "CONTACT_EMAIL", ""
            ),
            "wechat": os.environ.get("CONTACT_WECHAT", ""),
            "registered_address": os.environ.get(
                "CONTACT_REGISTERED_ADDRESS", ""
            ),
        },
    ),
]


async def init_system_config(session) -> None:
    """初始化系统配置。已存在的配置跳过。"""
    for key, description, value_factory in CONFIGS:
        stmt = select(SystemConfig).where(SystemConfig.key == key)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("配置已存在，跳过: %s", key)
            continue

        config = SystemConfig(
            key=key,
            value=value_factory(),
            description=description,
        )
        session.add(config)
        logger.info("创建配置: %s", key)

    await session.flush()
    print("  + 系统配置已初始化")
