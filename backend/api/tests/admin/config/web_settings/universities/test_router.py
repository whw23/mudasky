"""院校管理路由测试。

覆盖管理员院校管理端点，包括图片上传和学科关联。
"""

from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictException, NotFoundException

SVC_PATH = (
    "api.admin.config.web_settings.universities.router.UniversityService"
)
IMAGE_REPO_PATH = (
    "api.admin.config.web_settings.universities.router.image_repo"
)


def _make_university(**kwargs) -> MagicMock:
    """创建模拟院校对象。"""
    uni = MagicMock()
    uni.id = kwargs.get("id", "uni-001")
    uni.name = kwargs.get("name", "清华大学")
    uni.name_en = kwargs.get("name_en", "Tsinghua University")
    uni.country = kwargs.get("country", "中国")
    uni.logo_image_id = kwargs.get("logo_image_id", None)
    return uni


def _make_university_image(**kwargs) -> MagicMock:
    """创建模拟院校图片对象。"""
    img = MagicMock()
    img.id = kwargs.get("id", "rec-001")
    img.university_id = kwargs.get("university_id", "uni-001")
    img.image_id = kwargs.get("image_id", "img-001")
    img.sort_order = kwargs.get("sort_order", 0)
    return img


class TestUploadLogo:
    """POST /universities/list/detail/upload-logo 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService 和 image_repo。"""
        with patch(SVC_PATH) as mock_svc_cls, patch(IMAGE_REPO_PATH) as mock_img_repo:
            self.mock_svc = AsyncMock()
            mock_svc_cls.return_value = self.mock_svc
            self.mock_img_repo = mock_img_repo
            yield

    async def test_upload_logo_success(self, client, superuser_headers):
        """上传校徽成功返回 200。"""
        self.mock_svc.upload_logo.return_value = "img-123"

        # mock image_repo.get_by_id
        image = MagicMock()
        image.id = "img-123"
        image.filename = "logo.jpg"
        image.mime_type = "image/jpeg"
        image.file_size = 1024
        self.mock_img_repo.get_by_id = AsyncMock(return_value=image)

        files = {"file": ("logo.jpg", b"fake image", "image/jpeg")}
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-logo"
            "?university_id=uni-001",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "img-123"
        assert data["filename"] == "logo.jpg"

    async def test_upload_logo_not_found(self, client, superuser_headers):
        """院校不存在返回 404。"""
        self.mock_svc.upload_logo.side_effect = NotFoundException(
            message="院校不存在", code="UNIVERSITY_NOT_FOUND"
        )

        files = {"file": ("logo.jpg", b"fake image", "image/jpeg")}
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-logo"
            "?university_id=nonexistent",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_upload_logo_missing_file(self, client, superuser_headers):
        """缺少文件参数返回 422。"""
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-logo"
            "?university_id=uni-001",
            headers=superuser_headers,
        )

        assert resp.status_code == 422

    async def test_upload_logo_missing_university_id(
        self, client, superuser_headers
    ):
        """缺少 university_id 参数返回 422。"""
        files = {"file": ("logo.jpg", b"fake image", "image/jpeg")}
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-logo",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 422


class TestUploadImage:
    """POST /universities/list/detail/upload-image 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_upload_image_success(self, client, superuser_headers):
        """上传院校图片成功返回 201。"""
        uni_image = _make_university_image()
        self.mock_svc.upload_image.return_value = uni_image

        files = {"file": ("photo.jpg", b"fake image", "image/jpeg")}
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-image"
            "?university_id=uni-001",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == "rec-001"
        assert data["image_id"] == "img-001"
        assert data["sort_order"] == 0

    async def test_upload_image_limit_exceeded(self, client, superuser_headers):
        """超过 5 张限制返回 409。"""
        self.mock_svc.upload_image.side_effect = ConflictException(
            message="院校图片最多 5 张", code="UNIVERSITY_IMAGE_LIMIT"
        )

        files = {"file": ("photo.jpg", b"fake image", "image/jpeg")}
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-image"
            "?university_id=uni-001",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 409

    async def test_upload_image_not_found(self, client, superuser_headers):
        """院校不存在返回 404。"""
        self.mock_svc.upload_image.side_effect = NotFoundException(
            message="院校不存在", code="UNIVERSITY_NOT_FOUND"
        )

        files = {"file": ("photo.jpg", b"fake image", "image/jpeg")}
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-image"
            "?university_id=nonexistent",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_upload_image_missing_file(self, client, superuser_headers):
        """缺少文件参数返回 422。"""
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/upload-image"
            "?university_id=uni-001",
            headers=superuser_headers,
        )

        assert resp.status_code == 422


class TestDeleteImage:
    """POST /universities/list/detail/delete-image 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_image_success(self, client, superuser_headers):
        """删除院校图片成功返回 204。"""
        self.mock_svc.delete_image.return_value = None

        resp = await client.post(
            "/admin/web-settings/universities/list/detail/delete-image",
            json={"university_id": "uni-001", "image_record_id": "rec-001"},
            headers=superuser_headers,
        )

        assert resp.status_code == 204

    async def test_delete_image_not_found(self, client, superuser_headers):
        """图片记录不存在返回 404。"""
        self.mock_svc.delete_image.side_effect = NotFoundException(
            message="图片记录不存在", code="UNIVERSITY_IMAGE_NOT_FOUND"
        )

        resp = await client.post(
            "/admin/web-settings/universities/list/detail/delete-image",
            json={"university_id": "uni-001", "image_record_id": "nonexistent"},
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_delete_image_missing_university_id(
        self, client, superuser_headers
    ):
        """缺少 university_id 返回 422。"""
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/delete-image",
            json={"image_record_id": "rec-001"},
            headers=superuser_headers,
        )

        assert resp.status_code == 422

    async def test_delete_image_missing_record_id(self, client, superuser_headers):
        """缺少 image_record_id 返回 422。"""
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/delete-image",
            json={"university_id": "uni-001"},
            headers=superuser_headers,
        )

        assert resp.status_code == 422


