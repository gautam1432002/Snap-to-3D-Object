import asyncio
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.db.database import init_db
from app.main import app


@pytest.fixture(autouse=True)
def setup_test_env(tmp_path, monkeypatch):
    test_db = tmp_path / "test_foldly.db"
    test_storage = tmp_path / "test_storage"
    test_storage.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(get_settings(), "DATABASE_URL", f"sqlite+aiosqlite:///{test_db}")
    monkeypatch.setattr(get_settings(), "STORAGE_PATH", test_storage)
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")

    asyncio.run(init_db())
    yield


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
