from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.config import get_settings

settings = get_settings()

# ── App Instance ──────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
)

# ── CORS ──────────────────────────────────────────────────────
# MUST be added before any other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ewaka-pulse.vercel.app",
        "https://ewaka-pulse-git-main-samueloscar.vercel.app",
        "https://ewaka-pulse-samueloscar.vercel.app",
    ],
    # Wildcard for any Vercel preview host (allow_origins does not support glob patterns)
    allow_origin_regex=r"https://[^/]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Security Headers Middleware ───────────────────────────────
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
from app.routers import auth, children, villages, dashboard, attendance, grades, staff, activities, meals, biometrics, mental_health

app.include_router(auth.router)
app.include_router(children.router)
app.include_router(villages.router)
app.include_router(dashboard.router)
app.include_router(attendance.router)
app.include_router(grades.router)
app.include_router(staff.router)
app.include_router(activities.router)
app.include_router(meals.router)
app.include_router(biometrics.router)
app.include_router(mental_health.router)

# ── Health Check ──────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
