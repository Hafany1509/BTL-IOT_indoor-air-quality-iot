"""Main FastAPI application entry point with modular routers and CORS support."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.alerts import router as alerts_router
from app.routers.audit import router as audit_router
from app.routers.auth import router as auth_router
from app.routers.commands import router as commands_router
from app.routers.devices import router as devices_router
from app.routers.users import router as users_router

app = FastAPI(
    title="Indoor Air Quality IoT API",
    description="REST API for Indoor Air Quality Monitoring, RBAC, Alerting & Actuator Control",
    version="1.0.0",
)

# Enable CORS for Frontend (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(devices_router, prefix="/api/v1")
app.include_router(commands_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["system"])
def health() -> dict[str, str]:
    """Liveness probe endpoint."""
    return {"status": "ok", "service": "api"}
