"""允许 python -m scripts.init 执行。"""

import asyncio

from app.core.logging import setup_logging

from . import main

setup_logging()
asyncio.run(main())
