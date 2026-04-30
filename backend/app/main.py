from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth

settings = get_settings()

# ── App Instance ──────────────────────────────────────────────
# docs_url and redoc_url are None in production — security spec
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
)

# ── CORS ──────────────────────────────────────────────────────
# SECURITY: Only whitelisted origins. Never wildcard (*).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Security Headers Middleware ───────────────────────────────
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router)


# ── Health Check ──────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Public endpoint — confirms the API is running."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }