"""ImportService（成功案例）测试共用工具。

提供 mock 工厂函数和测试数据构建方法。
"""

import io
import zipfile
from unittest.mock import AsyncMock, MagicMock

from openpyxl import Workbook

from app.db.case.models import SuccessCase
from app.db.university.models import University

CASE_REPO = (
    "api.admin.config.web_settings.cases.import_service.repository"
)
IMAGE_REPO = (
    "api.admin.config.web_settings.cases.import_service.image_repo"
)
UNI_REPO = (
    "api.admin.config.web_settings.cases.import_service.uni_repo"
)


def make_case(case_id: str = "case-1", **kwargs) -> MagicMock:
    """创建模拟 SuccessCase 对象。"""
    case = MagicMock(spec=SuccessCase)
    case.id = case_id
    case.student_name = kwargs.get("student_name", "张三")
    case.university = kwargs.get("university", "哈佛大学")
    case.program = kwargs.get("program", "计算机科学")
    case.year = kwargs.get("year", 2026)
    case.testimonial = kwargs.get("testimonial", "感谢老师")
    case.is_featured = kwargs.get("is_featured", False)
    case.sort_order = kwargs.get("sort_order", 0)
    case.university_id = kwargs.get("university_id", None)
    case.avatar_image_id = kwargs.get("avatar_image_id", None)
    case.offer_image_id = kwargs.get("offer_image_id", None)
    return case


def make_university(
    uni_id: str = "uni-1", name: str = "哈佛大学"
) -> MagicMock:
    """创建模拟 University 对象。"""
    uni = MagicMock(spec=University)
    uni.id = uni_id
    uni.name = name
    return uni


def make_upload_file(
    content: bytes, filename: str = "test.xlsx"
) -> MagicMock:
    """创建模拟 UploadFile 对象。"""
    file = MagicMock()
    file.filename = filename
    file.read = AsyncMock(return_value=content)
    return file


def create_valid_workbook() -> Workbook:
    """创建符合成功案例导入格式的 workbook。"""
    wb = Workbook()
    ws = wb.active
    ws.title = "成功案例"
    ws.append([
        "学生姓名", "院校名称", "专业", "入学年份", "感言",
        "头像文件名", "Offer图文件名", "是否精选", "排序",
    ])
    ws.append([
        "张三", "哈佛大学", "计算机科学", 2026,
        "感谢老师们的帮助！", "张三_avatar.jpg",
        "张三_offer.jpg", "是", 0,
    ])
    return wb


def workbook_to_bytes(wb: Workbook) -> bytes:
    """将 workbook 转换为字节。"""
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def create_zip_with_excel(wb: Workbook) -> bytes:
    """创建包含 Excel 和 images/ 文件的 ZIP。"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("cases.xlsx", workbook_to_bytes(wb))
        zf.writestr("images/张三_avatar.jpg", b"fake-avatar")
        zf.writestr("images/张三_offer.jpg", b"fake-offer")
    return buf.getvalue()
