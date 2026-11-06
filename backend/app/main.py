from fastapi import FastAPI

app = FastAPI(title="Indoor Air Quality IoT", version="0.1.0")


@app.get("/api/v1/health", tags=["system"])
def health() -> dict[str, str]:
    # Liveness only: does not assert that the broker and database are available.
    return {"status": "ok", "service": "api"}

