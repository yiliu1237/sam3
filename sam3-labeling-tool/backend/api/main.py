from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .routes import segmentation, batch, export

# Create FastAPI app
app = FastAPI(
    title="SAM 3 Labeling Tool API",
    description="Backend API for SAM 3-powered image and video labeling",
    version="1.0.0"
)

# CORS middleware - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(segmentation.router)
app.include_router(batch.router)
app.include_router(export.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SAM 3 Labeling Tool API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
