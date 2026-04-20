"""院校专业模型。"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.db.base import Base


class UniversityProgram(Base):
    """院校专业，关联学科小分类。"""

    __tablename__ = "university_program"
    __table_args__ = (
        UniqueConstraint("university_id", "name", name="uq_university_program"),
    )

    id = Column(String(36), primary_key=True)
    university_id = Column(
        String(36),
        ForeignKey("university.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(200), nullable=False)
    discipline_id = Column(
        String(36),
        ForeignKey("discipline.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
