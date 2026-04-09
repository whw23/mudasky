"""E2E 测试公共 fixtures。

独立于单元测试 conftest，通过 gateway:80 发送真实 HTTP 请求。
"""

import asyncio
import base64
import json
import time

import httpx
import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

E2E_BASE_URL = "http://localhost"
CSRF_HEADER = {"X-Requested-With": "XMLHttpRequest"}
SUPERUSER_USERNAME = "mudasky"
SUPERUSER_PASSWORD = "mudasky@12321."


async def encrypt_password(
    client: httpx.AsyncClient, password: str
) -> dict:
    """获取公钥并加密密码（模拟前端 RSA 加密行为）。"""
    resp = await client.get("/api/auth/public-key")
    assert resp.status_code == 200
    data = resp.json()
    public_key = serialization.load_pem_public_key(
        data["public_key"].encode()
    )
    nonce = data["nonce"]
    payload = json.dumps(
        {
            "password": password,
            "nonce": nonce,
            "timestamp": int(time.time()),
        }
    ).encode()
    encrypted = public_key.encrypt(
        payload,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return {
        "encrypted_password": base64.b64encode(encrypted).decode(),
        "nonce": nonce,
    }


@pytest.fixture(scope="session")
def event_loop():
    """Session 级事件循环。"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def wait_for_healthy():
    """等待服务就绪。"""
    async with httpx.AsyncClient(base_url=E2E_BASE_URL) as client:
        for _ in range(30):
            try:
                resp = await client.get("/api/health")
                if resp.status_code == 200:
                    return
            except httpx.ConnectError:
                pass
            await asyncio.sleep(1)
    pytest.fail("容器未就绪：/api/health 超时")


@pytest.fixture
async def anon_client(wait_for_healthy):
    """未认证、不带 CSRF header 的 client。"""
    async with httpx.AsyncClient(base_url=E2E_BASE_URL) as client:
        yield client


@pytest.fixture
async def e2e_client(wait_for_healthy):
    """未认证但带 CSRF header 的 client。"""
    async with httpx.AsyncClient(
        base_url=E2E_BASE_URL,
        headers=CSRF_HEADER,
    ) as client:
        yield client


@pytest.fixture
async def superuser_client(wait_for_healthy):
    """已用超级管理员登录的 client。"""
    async with httpx.AsyncClient(
        base_url=E2E_BASE_URL,
        headers=CSRF_HEADER,
    ) as client:
        encrypted = await encrypt_password(client, SUPERUSER_PASSWORD)
        resp = await client.post(
            "/api/auth/login",
            json={
                "username": SUPERUSER_USERNAME,
                **encrypted,
            },
        )
        assert resp.status_code == 200, f"超级管理员登录失败: {resp.text}"
        yield client
