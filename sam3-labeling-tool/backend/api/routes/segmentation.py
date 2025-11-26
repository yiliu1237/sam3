from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import io
from typing import List

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from api.models import (
    TextPromptRequest,
    RefinePromptRequest,
    VideoSegmentRequest,
    SegmentationResult,
    Point,
    BBox
)
from services.sam3_service import get_sam3_service
from services.storage import get_storage_service

router = APIRouter(prefix="/api/segment", tags=["segmentation"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an image or video file"""
    try:
        storage = get_storage_service()

        # Read file content
        content = await file.read()

        # Save file
        file_id, file_path = await storage.save_upload(content, file.filename)

        # Get file type
        file_type = "image" if file.content_type.startswith("image") else "video"

        return {
            "file_id": file_id,
            "file_path": file_path,
            "file_type": file_type,
            "filename": file.filename
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/image/text", response_model=SegmentationResult)
async def segment_image_with_text(request: TextPromptRequest):
    """Segment an image using text prompt"""
    try:
        sam3_service = get_sam3_service()
        storage = get_storage_service()

        # Get image path
        image_path = storage.get_upload_path(request.image_id)
        if not image_path:
            raise HTTPException(status_code=404, detail=f"Image {request.image_id} not found")

        # Load image
        image = Image.open(image_path).convert('RGB')

        # Segment with SAM 3
        result = sam3_service.segment_image_with_text(
            image=image,
            prompt=request.prompt,
            image_id=request.image_id,
            confidence_threshold=request.confidence_threshold
        )

        # Convert numpy arrays to lists for JSON serialization
        return {
            "masks": [[row.tolist() for row in mask] for mask in result["masks"]],
            "boxes": [[float(x) for x in box] for box in result["boxes"]],
            "scores": [float(score) for score in result["scores"]],
            "labels": [request.prompt] * len(result["scores"])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")


@router.post("/image/refine", response_model=SegmentationResult)
async def refine_segmentation(request: RefinePromptRequest):
    """Refine segmentation with points or boxes"""
    try:
        sam3_service = get_sam3_service()

        result = None

        # Refine with points
        if request.points:
            points = [(p.x, p.y) for p in request.points]
            labels = [p.label for p in request.points]

            result = sam3_service.refine_with_points(
                image_id=request.image_id,
                points=points,
                labels=labels,
                mask_id=request.mask_id
            )

        # Refine with boxes
        elif request.boxes:
            box = request.boxes[0]  # Use first box
            result = sam3_service.refine_with_box(
                image_id=request.image_id,
                box=(box.x1, box.y1, box.x2, box.y2)
            )

        else:
            raise HTTPException(status_code=400, detail="Must provide points or boxes")

        # Convert numpy arrays to lists
        return {
            "masks": [[row.tolist() for row in mask] for mask in result["masks"]],
            "boxes": [[float(x) for x in box] for box in result["boxes"]],
            "scores": [float(score) for score in result["scores"]]
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")


@router.post("/video/text")
async def segment_video_with_text(request: VideoSegmentRequest):
    """Segment a video using text prompt"""
    try:
        sam3_service = get_sam3_service()
        storage = get_storage_service()

        # Get video path
        video_path = storage.get_upload_path(request.video_id)
        if not video_path:
            raise HTTPException(status_code=404, detail=f"Video {request.video_id} not found")

        # Segment with SAM 3
        result = sam3_service.segment_video_with_text(
            video_path=video_path,
            prompt=request.prompt,
            video_id=request.video_id,
            frame_index=request.frame_index,
            confidence_threshold=request.confidence_threshold
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video segmentation failed: {str(e)}")


@router.delete("/clear/{file_id}")
async def clear_file_state(file_id: str, file_type: str = "image"):
    """Clear cached state for a file"""
    try:
        sam3_service = get_sam3_service()

        if file_type == "image":
            sam3_service.clear_image_state(file_id)
        else:
            sam3_service.clear_video_session(file_id)

        return {"message": f"State cleared for {file_id}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")
