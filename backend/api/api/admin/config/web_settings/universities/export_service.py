"""院校批量导出服务。

导出为 ZIP 格式，包含：
- universities.xlsx（Sheet1 "基本信息" + Sheet2 "专业列表"）
- images/ 目录（所有院校的 logo + 展示图）
"""

import json

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository as disc_repo
from app.db.image import repository as image_repo
from app.db.university import repository as uni_repo
from app.db.university import program_repository as prog_repo
from app.utils.excel_io import create_zip, workbook_to_bytes, write_sheet_header


class ExportService:
    """院校批量导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def export(self) -> bytes:
        """导出所有院校为 ZIP（包含 Excel + images/）。"""
        universities, _ = await uni_repo.list_universities(
            self.session, offset=0, limit=10000
        )

        wb = Workbook()

        # Sheet1: 基本信息
        ws1 = wb.active
        ws1.title = "基本信息"
        headers = [
            "名称",
            "英文名",
            "国家",
            "省份",
            "城市",
            "网站",
            "描述",
            "录取要求",
            "奖学金信息",
            "纬度",
            "经度",
            "是否精选",
            "排序",
            "Logo文件名",
            "展示图文件名",
            "QS排名",
        ]
        write_sheet_header(ws1, headers)

        # Sheet2: 专业列表
        ws2 = wb.create_sheet("专业列表")
        write_sheet_header(ws2, ["院校名称", "专业名称", "大分类", "小分类"])

        # 收集图片文件
        image_files = {}  # {filename: bytes}

        for uni in universities:
            # 获取专业
            programs = await prog_repo.list_programs(self.session, uni.id)

            # Logo 文件名
            logo_filename = None
            if uni.logo_image_id:
                logo_image = await image_repo.get_by_id(
                    self.session, uni.logo_image_id
                )
                if logo_image:
                    ext = self._get_extension(logo_image.mime_type)
                    logo_filename = f"{uni.name}_logo{ext}"
                    image_files[f"images/{logo_filename}"] = (
                        logo_image.file_data
                    )

            # 展示图文件名
            uni_images = await uni_repo.list_university_images(
                self.session, uni.id
            )
            image_filenames = []
            for idx, ui in enumerate(uni_images, start=1):
                img = await image_repo.get_by_id(self.session, ui.image_id)
                if img:
                    ext = self._get_extension(img.mime_type)
                    fn = f"{uni.name}_{idx}{ext}"
                    image_filenames.append(fn)
                    image_files[f"images/{fn}"] = img.file_data

            # QS 排名 JSON
            qs_rankings_str = None
            if uni.qs_rankings:
                qs_rankings_str = json.dumps(uni.qs_rankings, ensure_ascii=False)

            # 写入 Sheet1
            ws1.append(
                [
                    uni.name,
                    uni.name_en,
                    uni.country,
                    uni.province,
                    uni.city,
                    uni.website,
                    uni.description,
                    uni.admission_requirements,
                    uni.scholarship_info,
                    uni.latitude,
                    uni.longitude,
                    "是" if uni.is_featured else "否",
                    uni.sort_order,
                    logo_filename,
                    ",".join(image_filenames) if image_filenames else None,
                    qs_rankings_str,
                ]
            )

            # 写入 Sheet2
            for prog in programs:
                disc = await disc_repo.get_discipline_by_id(
                    self.session, prog.discipline_id
                )
                if disc:
                    cat = await disc_repo.get_category_by_id(
                        self.session, disc.category_id
                    )
                    ws2.append(
                        [
                            uni.name,
                            prog.name,
                            cat.name if cat else "",
                            disc.name,
                        ]
                    )

        # 打包 ZIP
        excel_bytes = workbook_to_bytes(wb)
        files = {"universities.xlsx": excel_bytes}
        files.update(image_files)

        return create_zip(files)

    def _get_extension(self, mime_type: str) -> str:
        """根据 MIME 类型获取文件扩展名。"""
        mime_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/svg+xml": ".svg",
        }
        return mime_map.get(mime_type, ".jpg")
