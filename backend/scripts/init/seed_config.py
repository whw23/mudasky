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
            "about_office_images": [],
            # 院校选择页面
            "universities_title": {
                "zh": "精选合作院校",
                "en": "Selected Partner Universities",
                "ja": "選定パートナー大学",
                "de": "Ausgewählte Partneruniversitäten",
            },
            "universities_intro": {
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
            "study_abroad_overview_title": {
                "zh": "多国留学项目",
                "en": "Multi-Country Study Programs",
                "ja": "多国留学プログラム",
                "de": "Mehrländer-Studienprogramme",
            },
            "study_abroad_overview_content": {
                "zh": "慕大国际提供德国、日本、法国、韩国等多国留学服务。我们根据每位学生的学术背景、语言水平和职业规划，量身定制最适合的留学方案。无论你是高中毕业生还是大学在读，我们都有匹配的留学项目。",
                "en": "MUTU International offers study abroad services for Germany, Japan, France, South Korea, and more. We create customized study plans based on each student's academic background, language proficiency, and career goals. Whether you're a high school graduate or university student, we have matching programs for you.",
                "ja": "慕大国際はドイツ、日本、フランス、韓国などの留学サービスを提供しています。各学生の学術背景、言語能力、キャリアプランに基づいて、最適な留学プランをカスタマイズします。高校卒業生でも大学生でも、マッチングプログラムがあります。",
                "de": "MUTU International bietet Studiendienstleistungen für Deutschland, Japan, Frankreich, Südkorea und mehr. Wir erstellen maßgeschneiderte Studienpläne basierend auf akademischem Hintergrund, Sprachkenntnissen und Karrierezielen. Ob Abiturient oder Student, wir haben passende Programme.",
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
            "visa_docs": [
                {"zh": "有效护照原件及复印件", "en": "Valid passport original and copies", "ja": "有効なパスポート原本とコピー", "de": "Gültiger Reisepass Original und Kopien"},
                {"zh": "签证申请表", "en": "Visa application form", "ja": "ビザ申請フォーム", "de": "Visaantragsformular"},
                {"zh": "证件照（符合使馆规格）", "en": "Passport photos (embassy specifications)", "ja": "証明写真（大使館規格に準拠）", "de": "Passfotos (Botschaftsspezifikationen)"},
                {"zh": "大学录取通知书", "en": "University admission letter", "ja": "大学入学許可書", "de": "Universitätszulassungsschreiben"},
                {"zh": "资金证明 / 经济担保", "en": "Proof of finances / financial guarantee", "ja": "資金証明 / 経済保証", "de": "Finanznachweis / Finanzgarantie"},
                {"zh": "保险证明", "en": "Insurance certificate", "ja": "保険証明書", "de": "Versicherungszertifikat"},
                {"zh": "语言证书", "en": "Language certificate", "ja": "語学証明書", "de": "Sprachzertifikat"},
                {"zh": "学历认证文件", "en": "Academic credential verification", "ja": "学歴認証書類", "de": "Akademische Anerkennungsdokumente"},
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
                {"zh": "务必提前至少3个月开始准备签证材料，避免时间紧张影响入学。", "en": "Start preparing visa materials at least 3 months in advance to avoid time pressure affecting enrollment.", "ja": "入学に影響を与える時間的プレッシャーを避けるため、少なくとも3か月前にビザ書類の準備を開始してください。", "de": "Beginnen Sie mindestens 3 Monate im Voraus mit der Vorbereitung der Visumsunterlagen, um Zeitdruck zu vermeiden."},
                {"zh": "资金证明金额需满足目标国家的最低要求，德国目前为每年10,332欧元。", "en": "Financial proof must meet the target country's minimum requirements; Germany currently requires €10,332 per year.", "ja": "資金証明額は対象国の最低要件を満たす必要があり、ドイツは現在年間10,332ユーロです。", "de": "Der Finanznachweis muss die Mindestanforderungen des Ziellandes erfüllen; Deutschland verlangt derzeit 10.332 € pro Jahr."},
                {"zh": "所有非中文和非英文的材料需要经过公证翻译，建议选择正规翻译机构。", "en": "All non-Chinese and non-English documents need certified translation; use reputable translation agencies.", "ja": "すべての非中国語および非英語の書類は公証翻訳が必要です。評判の良い翻訳機関を選択してください。", "de": "Alle nicht-chinesischen und nicht-englischen Dokumente benötigen beglaubigte Übersetzungen; nutzen Sie seriöse Übersetzungsbüros."},
                {"zh": "面签时保持自信、回答真实，不要背诵答案，注意着装得体。", "en": "Stay confident during the interview, answer honestly, don't memorize answers, and dress appropriately.", "ja": "面接時は自信を持ち、正直に答え、答えを暗記せず、適切な服装に注意してください。", "de": "Bleiben Sie während des Interviews selbstbewusst, antworten Sie ehrlich, memorieren Sie keine Antworten und kleiden Sie sich angemessen."},
                {"zh": "保留所有申请材料的副本和电子版，以备使馆要求补充材料。", "en": "Keep copies and digital versions of all application materials in case the embassy requests supplements.", "ja": "大使館が補足資料を要求した場合に備えて、すべての申請書類のコピーと電子版を保管してください。", "de": "Bewahren Sie Kopien und digitale Versionen aller Antragsunterlagen auf, falls die Botschaft Ergänzungen anfordert."},
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
            "requirements_overview_title": {
                "zh": "各国申请条件",
                "en": "Application Requirements by Country",
                "ja": "各国の出願要件",
                "de": "Bewerbungsanforderungen nach Land",
            },
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
            # 留学生活页面
            "life_guide_title": {
                "zh": "留学生活指南",
                "en": "Study Abroad Living Guide",
                "ja": "留学生活ガイド",
                "de": "Studienführer für das Leben im Ausland",
            },
            "life_guide_intro": {
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
            "history": "",
            "mission": "",
            "vision": "",
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
