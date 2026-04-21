"""院校图片集模型。"""

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class UniversityImage(Base):
    """院校图片集（每院校最多 5 张）。"""

    __tablename__ = "university_image"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    university_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("university.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("image.id"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
