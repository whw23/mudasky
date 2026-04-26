"""页面模组（page_blocks）种子数据。

每个页面由若干 Block 组成，Block.data 包含实际内容。
数据从原 site_info 中的页面级字段迁移而来。
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


def build_home_blocks() -> list[dict]:
    """首页区块。"""
    return [
        _block(
            "intro",
            section_tag="About Us",
            section_title={
                "zh": "关于我们",
                "en": "About Us",
                "ja": "私たちについて",
                "de": "Über uns",
            },
            bg_color="gray",
            data={
                "title": {
                    "zh": "关于我们",
                    "en": "About Us",
                    "ja": "私たちについて",
                    "de": "Über uns",
                },
                "content": {
                    "zh": "慕大国际从事小语种留学项目运营已15年，为慕尼黑大学语言中心江苏省唯一指定招生考点。慕尼黑大学语言中心是官方德语培训基地考点。我们致力于为学生提供全方位的留学咨询、院校申请、签证办理等一站式服务。",
                    "en": "MUTU International has been operating foreign language study abroad programs for 15 years and is the only designated enrollment center for the Munich University Language Center in Jiangsu Province. We are committed to providing students with comprehensive one-stop services including study abroad consulting, university applications, and visa processing.",
                    "ja": "慕大国際は小言語留学プログラムの運営を15年間行っており、ミュンヘン大学言語センターの江蘇省唯一の指定募集拠点です。ミュンヘン大学言語センターは公式のドイツ語トレーニング基地試験センターです。私たちは学生に留学コンサルティング、大学出願、ビザ申請などのワンストップサービスを提供することに専念しています。",
                    "de": "MUTU International betreibt seit 15 Jahren Fremdsprachenstudien-Programme und ist das einzige offizielle Anmeldezentrum des Sprachenzentrums der Ludwig-Maximilians-Universität München in der Provinz Jiangsu. Wir bieten umfassende Dienstleistungen wie Studienberatung, Universitätsbewerbungen und Visabearbeitung.",
                },
            },
        ),
        _block(
            "featured_data",
            section_tag="Partner Universities",
            section_title={
                "zh": "合作院校",
                "en": "Partner Universities",
                "ja": "パートナー大学",
                "de": "Partneruniversitäten",
            },
            options={"dataType": "universities", "maxItems": 6},
        ),
        _block(
            "featured_data",
            section_tag="Success Stories",
            section_title={
                "zh": "成功案例",
                "en": "Success Stories",
                "ja": "成功事例",
                "de": "Erfolgsgeschichten",
            },
            options={"dataType": "cases", "maxItems": 4},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {
                    "zh": "开启你的留学之旅",
                    "en": "Start Your Study Abroad Journey",
                    "ja": "留学の旅を始めよう",
                    "de": "Beginnen Sie Ihre Studienreise",
                },
                "desc": {
                    "zh": "15年专注国际教育，为你提供最专业的留学咨询服务",
                    "en": "15 years of dedication to international education, providing you with the most professional study abroad consulting services",
                    "ja": "15年間国際教育に専念し、最もプロフェッショナルな留学コンサルティングサービスを提供します",
                    "de": "15 Jahre internationale Bildung, professionelle Studienberatung",
                },
                "link": "/about",
                "showLogin": True,
            },
        ),
    ]


def build_about_blocks() -> list[dict]:
    """关于我们页面区块。"""
    return [
        _block(
            "contact_info",
            show_title=True,
            section_tag="Contact",
            section_title={
                "zh": "联系信息",
                "en": "Contact Information",
                "ja": "お問い合わせ",
                "de": "Kontaktinformationen",
            },
            bg_color="gray",
        ),
        _block(
            "intro",
            section_tag="Our Story",
            section_title={
                "zh": "15年专注国际教育",
                "en": "15 Years of International Education",
                "ja": "国際教育に15年間専念",
                "de": "15 Jahre Internationale Bildung",
            },
            data={
                "title": {
                    "zh": "15年专注国际教育",
                    "en": "15 Years of International Education",
                    "ja": "国際教育に15年間専念",
                    "de": "15 Jahre Internationale Bildung",
                },
                "content": {
                    "zh": "慕大国际教育成立于2011年，专注于小语种留学项目运营已15年。作为慕尼黑大学语言中心江苏省唯一指定招生考点，我们始终秉承\"专业、诚信、高效\"的服务理念，为数百位学子成功圆梦海外名校。从最初的德语培训到如今涵盖德语、日语、英语等多语种留学服务，我们不断拓展业务版图，致力于成为中国领先的国际教育服务机构。",
                    "en": "Founded in 2011, MUTU International Education has been dedicated to foreign language study abroad programs for 15 years. As the only designated enrollment center for the Munich University Language Center in Jiangsu Province, we have always upheld the service philosophy of \"professionalism, integrity, and efficiency\", helping hundreds of students achieve their dreams of studying at prestigious overseas universities.",
                    "ja": "2011年設立、慕大国際教育は15年間小語種留学プロジェクトの運営に専念してきました。ミュンヘン大学言語センター江蘇省唯一の指定入試拠点として、「専門性、誠実さ、効率性」のサービス理念を堅持し、数百名の学生の海外名門大学進学をサポートしてきました。",
                    "de": "MUTU International Education wurde 2011 gegründet und widmet sich seit 15 Jahren dem Betrieb von Fremdsprachen-Studienprogrammen im Ausland. Als einziger designierter Einschreibungsort des Sprachenzentrums der Ludwig-Maximilians-Universität München in der Provinz Jiangsu haben wir stets die Servicephilosophie \"Professionalität, Integrität und Effizienz\" hochgehalten.",
                },
            },
        ),
        _block(
            "card_grid",
            section_tag="About Us",
            section_title={
                "zh": "使命与愿景",
                "en": "Mission & Vision",
                "ja": "使命とビジョン",
                "de": "Mission & Vision",
            },
            bg_color="gray",
            options={"cardType": "guide", "maxColumns": 3},
            data=[
                {
                    "icon": "Target",
                    "title": {"zh": "我们的使命", "en": "Our Mission", "ja": "私たちの使命", "de": "Unsere Mission"},
                    "desc": {"zh": "让学生上理想的好大学。", "en": "To help every student get into their ideal university.", "ja": "学生が理想の大学に入学できるようにすること。", "de": "Jedem Studenten den Zugang zur idealen Universität zu ermöglichen."},
                },
                {
                    "icon": "Eye",
                    "title": {"zh": "我们的愿景", "en": "Our Vision", "ja": "私たちのビジョン", "de": "Unsere Vision"},
                    "desc": {"zh": "实现学生接受优质高等教育的梦想，并依靠点点滴滴契而不舍的艰苦追求，成为最专业的国际教育资源咨询服务企业。", "en": "To fulfill students' dreams of quality higher education, and through persistent dedication, become the most professional international education consulting enterprise.", "ja": "学生の質の高い高等教育を受ける夢を実現し、たゆまぬ努力により、最も専門的な国際教育コンサルティング企業となること。", "de": "Die Träume der Studenten von hochwertiger Hochschulbildung zu verwirklichen und durch beharrliches Engagement das professionellste internationale Bildungsberatungsunternehmen zu werden."},
                },
                {
                    "icon": "Heart",
                    "title": {"zh": "我们的价值观", "en": "Our Values", "ja": "私たちの価値観", "de": "Unsere Werte"},
                    "desc": {"zh": "无条件让学生和家长满意、团队精神、团队互助、持续学习。", "en": "Unconditional student and parent satisfaction, team spirit, mutual support, and continuous learning.", "ja": "学生と保護者の無条件の満足、チームスピリット、チームの助け合い、継続的な学習。", "de": "Bedingungslose Zufriedenheit von Studenten und Eltern, Teamgeist, gegenseitige Unterstützung und kontinuierliches Lernen."},
                },
            ],
        ),
        _block(
            "gallery",
            section_tag="Office",
            section_title={
                "zh": "办公环境",
                "en": "Our Office",
                "ja": "オフィス環境",
                "de": "Büroumgebung",
            },
            data=[],
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {
                    "zh": "开启你的留学之旅",
                    "en": "Start Your Study Abroad Journey",
                    "ja": "留学の旅を始めよう",
                    "de": "Beginnen Sie Ihre Studienreise",
                },
                "desc": {
                    "zh": "专业团队为你量身定制留学方案，从选校到签证全程陪伴",
                    "en": "Our professional team creates customized study abroad plans, accompanying you from school selection to visa processing",
                    "ja": "プロフェッショナルチームがあなたのためにカスタマイズされた留学プランを作成し、学校選択からビザ取得まで全力でサポートします",
                    "de": "Unser professionelles Team erstellt maßgeschneiderte Studienpläne und begleitet Sie von der Schulauswahl bis zur Visabearbeitung",
                },
                "link": "/about",
                "showLogin": True,
            },
        ),
    ]


def build_universities_blocks() -> list[dict]:
    """院校选择页面区块。"""
    return [
        _block(
            "intro",
            section_tag="Universities",
            section_title={
                "zh": "精选合作院校",
                "en": "Selected Partner Universities",
                "ja": "選定パートナー大学",
                "de": "Ausgewählte Partneruniversitäten",
            },
            data={
                "title": {
                    "zh": "精选合作院校",
                    "en": "Selected Partner Universities",
                    "ja": "選定パートナー大学",
                    "de": "Ausgewählte Partneruniversitäten",
                },
                "content": {
                    "zh": "我们与德国多所知名大学建立了深度合作关系，为学生提供更便捷的申请通道和更高的录取成功率。以下是部分合作院校，涵盖综合性大学、理工大学和应用科学大学。",
                    "en": "We have established deep partnerships with numerous prestigious German universities, providing students with more convenient application channels and higher admission success rates. Below are some of our partner institutions, covering comprehensive universities, technical universities, and universities of applied sciences.",
                    "ja": "ドイツの多くの有名大学と深い協力関係を築き、学生により便利な出願チャネルと高い合格率を提供しています。以下は一部の協力大学で、総合大学、工科大学、応用科学大学を含みます。",
                    "de": "Wir haben tiefe Partnerschaften mit zahlreichen renommierten deutschen Universitäten aufgebaut und bieten Studenten bequemere Bewerbungskanäle und höhere Zulassungsraten. Nachfolgend sind einige unserer Partnerinstitutionen aufgeführt, darunter umfassende Universitäten, technische Universitäten und Fachhochschulen.",
                },
            },
        ),
        _block(
            "university_list",
            show_title=False,
            options={},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {
                    "zh": "找到适合你的留学院校",
                    "en": "Find Your Perfect University",
                    "ja": "あなたにぴったりの大学を見つけよう",
                    "de": "Finden Sie Ihre perfekte Universität",
                },
                "desc": {
                    "zh": "我们提供免费的背景评估服务，帮你了解最适合的留学方向",
                    "en": "We offer free background assessments to help you find the best study abroad direction",
                    "ja": "無料のバックグラウンド評価サービスを提供し、最適な留学方向を見つけるお手伝いをします",
                    "de": "Wir bieten kostenlose Hintergrundprüfungen, um Ihnen die beste Studienrichtung zu finden",
                },
                "link": "/about",
                "showLogin": True,
            },
        ),
    ]


def build_cases_blocks() -> list[dict]:
    """成功案例页面区块。"""
    return [
        _block(
            "intro",
            section_tag="Success Stories",
            section_title={
                "zh": "学生成功故事",
                "en": "Student Success Stories",
                "ja": "学生成功ストーリー",
                "de": "Studentische Erfolgsgeschichten",
            },
            data={
                "title": {
                    "zh": "学生成功故事",
                    "en": "Student Success Stories",
                    "ja": "学生成功ストーリー",
                    "de": "Studentische Erfolgsgeschichten",
                },
                "content": {
                    "zh": "每一个成功的留学故事都始于一次专业的咨询",
                    "en": "Every successful study abroad story begins with a professional consultation",
                    "ja": "すべての成功した留学物語はプロフェッショナルな相談から始まります",
                    "de": "Jede erfolgreiche Studiengeschichte beginnt mit einer professionellen Beratung",
                },
            },
        ),
        _block(
            "case_grid",
            show_title=False,
            options={},
        ),
        _block(
            "cta",
            show_title=False,
            options={"variant": "border-t"},
            data={
                "title": {
                    "zh": "你也可以成为下一个成功案例",
                    "en": "You Could Be Our Next Success Story",
                    "ja": "あなたも次の成功事例になれる",
                    "de": "Sie könnten unsere nächste Erfolgsgeschichte sein",
                },
                "desc": {
                    "zh": "每一个成功的留学故事都始于一次专业的咨询",
                    "en": "Every successful study abroad story begins with a professional consultation",
                    "ja": "すべての成功した留学物語はプロフェッショナルな相談から始まります",
                    "de": "Jede erfolgreiche Studiengeschichte beginnt mit einer professionellen Beratung",
                },
                "link": "/about",
                "showLogin": True,
            },
        ),
    ]


def build_page_blocks() -> dict:
    """构建所有页面的区块配置。"""
    from .seed_page_blocks_extra import (
        build_requirements_blocks,
        build_study_abroad_blocks,
        build_visa_blocks,
    )
    from .seed_page_blocks_life import build_life_blocks, build_news_blocks

    return {
        "home": build_home_blocks(),
        "about": build_about_blocks(),
        "universities": build_universities_blocks(),
        "cases": build_cases_blocks(),
        "study-abroad": build_study_abroad_blocks(),
        "visa": build_visa_blocks(),
        "requirements": build_requirements_blocks(),
        "life": build_life_blocks(),
        "news": build_news_blocks(),
    }
