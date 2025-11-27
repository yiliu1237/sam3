from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image, ImageDraw, ImageFont
import io
import numpy as np
from typing import List
from pathlib import Path
import zipfile
import tempfile
import json

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

        # Convert tensors to lists for JSON serialization
        # Convert masks to integers (0 or 1) - handle both numpy arrays and tensors
        masks_converted = []
        for mask in result["masks"]:
            # Convert tensor to numpy if needed
            if hasattr(mask, 'cpu'):
                mask = mask.cpu().numpy()
            elif not isinstance(mask, np.ndarray):
                mask = np.array(mask)

            # Ensure mask is 2D (height x width)
            if mask.ndim != 2:
                print(f"Warning: mask has unexpected dimensions: {mask.shape}")
                # Try to reshape if possible
                if mask.ndim == 1:
                    # This shouldn't happen, but handle it
                    size = int(np.sqrt(mask.shape[0]))
                    if size * size == mask.shape[0]:
                        mask = mask.reshape(size, size)

            # Convert to int and then to list (keeping 2D structure)
            mask_int = mask.astype(int).tolist()
            masks_converted.append(mask_int)

        return {
            "masks": masks_converted,
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

        # Convert tensors to lists for JSON serialization
        # Convert masks to integers (0 or 1) - handle both numpy arrays and tensors
        masks_converted = []
        for mask in result["masks"]:
            # Convert tensor to numpy if needed
            if hasattr(mask, 'cpu'):
                mask = mask.cpu().numpy()
            elif not isinstance(mask, np.ndarray):
                mask = np.array(mask)

            # Ensure mask is 2D (height x width)
            if mask.ndim != 2:
                print(f"Warning: mask has unexpected dimensions: {mask.shape}")

            # Convert to int and then to list (keeping 2D structure)
            mask_int = mask.astype(int).tolist()
            masks_converted.append(mask_int)

        return {
            "masks": masks_converted,
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


@router.post("/save_masks")
async def save_masks(request: dict):
    """
    Save instance segmentation masks in multiple formats

    Expected request format:
    {
        "image_id": "xxx",
        "output_path": "/path/to/save/folder",
        "masks": [[mask1], [mask2], ...],  # 2D arrays
        "scores": [0.9, 0.8, ...],
        "boxes": [[x1,y1,x2,y2], ...]
    }

    Saves:
    1. overlay_visualization.png - Colored overlay on original image
    2. instances.png - Instance ID map (0=bg, 1=inst0, 2=inst1, ...)
    3. combined_mask.png - All instances merged into binary mask
    4. masks/mask_XX.png - Individual binary masks
    """
    try:
        storage = get_storage_service()

        # Extract request data
        image_id = request.get("image_id")
        output_path = request.get("output_path")
        masks = request.get("masks", [])
        scores = request.get("scores", [])
        boxes = request.get("boxes", [])

        print(f"🔍 Backend received save request:")
        print(f"   image_id: {image_id}")
        print(f"   output_path: {output_path}")
        print(f"   output_path type: {type(output_path)}")
        print(f"   masks count: {len(masks)}")

        if not image_id or not output_path or not masks:
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Get original image
        image_path = storage.get_upload_path(image_id)
        if not image_path:
            raise HTTPException(status_code=404, detail=f"Image {image_id} not found")

        original_image = Image.open(image_path).convert('RGB')
        width, height = original_image.size

        # Create output directory
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        masks_dir = output_dir / "masks"
        masks_dir.mkdir(exist_ok=True)

        # Convert masks to numpy arrays
        masks_np = []
        for mask in masks:
            mask_array = np.array(mask, dtype=np.uint8)
            # Resize mask to match original image size if needed
            if mask_array.shape != (height, width):
                mask_pil = Image.fromarray(mask_array * 255)
                mask_pil = mask_pil.resize((width, height), Image.NEAREST)
                mask_array = (np.array(mask_pil) > 128).astype(np.uint8)
            masks_np.append(mask_array)

        # 1. Create overlay visualization with boundaries (colored masks on original image)
        overlay = original_image.copy().convert('RGBA')
        overlay_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))

        for idx, mask in enumerate(masks_np):
            # Generate unique color for this instance (same as frontend)
            hue = (idx * 360 / max(len(masks_np), 1)) % 360
            saturation = 70 + (idx % 3) * 10
            lightness = 50 + (idx % 2) * 10

            # Convert HSL to RGB
            from colorsys import hls_to_rgb
            r, g, b = hls_to_rgb(hue/360, lightness/100, saturation/100)
            fill_color = (int(r*255), int(g*255), int(b*255), 76)  # 30% opacity for fill
            border_color = (int(r*255), int(g*255), int(b*255), 255)  # Full opacity for border

            # Create colored mask (transparent fill)
            colored_mask = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            colored_mask_array = np.array(colored_mask)
            colored_mask_array[mask > 0] = fill_color

            # Detect edges (4-connectivity)
            mask_h, mask_w = mask.shape
            edges = np.zeros_like(mask, dtype=bool)
            for y in range(mask_h):
                for x in range(mask_w):
                    if mask[y, x] > 0:
                        # Check 4-connected neighbors
                        is_edge = False
                        if x == 0 or x == mask_w - 1 or y == 0 or y == mask_h - 1:
                            is_edge = True
                        elif (mask[y-1, x] == 0 or mask[y+1, x] == 0 or
                              mask[y, x-1] == 0 or mask[y, x+1] == 0):
                            is_edge = True
                        if is_edge:
                            edges[y, x] = True

            # Draw bright colored borders
            colored_mask_array[edges] = border_color
            colored_mask = Image.fromarray(colored_mask_array)
            overlay_layer = Image.alpha_composite(overlay_layer, colored_mask)

        overlay = Image.alpha_composite(overlay, overlay_layer)
        overlay.convert('RGB').save(output_dir / "overlay_visualization.png")

        # 2. Create instances map (pixel value = instance ID)
        instances_map = np.zeros((height, width), dtype=np.uint8)
        for idx, mask in enumerate(masks_np):
            instances_map[mask > 0] = idx + 1  # 0=background, 1=inst0, 2=inst1, ...
        Image.fromarray(instances_map).save(output_dir / "instances.png")

        # 3. Create combined binary mask (all instances merged)
        combined_mask = np.zeros((height, width), dtype=np.uint8)
        for mask in masks_np:
            combined_mask = np.maximum(combined_mask, mask)
        Image.fromarray(combined_mask * 255).save(output_dir / "combined_mask.png")

        # 4. Save individual binary masks
        for idx, mask in enumerate(masks_np):
            mask_filename = f"mask_{idx:02d}.png"
            Image.fromarray(mask * 255).save(masks_dir / mask_filename)

        return {
            "message": "Masks saved successfully",
            "output_path": str(output_dir),
            "files_created": {
                "overlay_visualization": str(output_dir / "overlay_visualization.png"),
                "instances_map": str(output_dir / "instances.png"),
                "combined_mask": str(output_dir / "combined_mask.png"),
                "individual_masks": len(masks_np)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")


@router.post("/download_masks")
async def download_masks(request: dict):
    """
    Download instance segmentation masks as a ZIP file

    Returns a ZIP containing:
    - overlay_visualization.png - Colored masks with boundaries
    - overlay_with_labels.png - Colored masks with ID labels at center
    - combined_mask.png - All instances merged into binary mask
    - masks/mask_XX.png - Individual binary masks
    - metadata.json - Prompt, scores, boxes, and other metadata
    """
    try:
        storage = get_storage_service()

        # Extract request data
        image_id = request.get("image_id")
        masks = request.get("masks", [])
        scores = request.get("scores", [])
        boxes = request.get("boxes", [])
        prompt = request.get("prompt", "")  # Get prompt if available

        if not image_id or not masks:
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Get original image
        image_path = storage.get_upload_path(image_id)
        if not image_path:
            raise HTTPException(status_code=404, detail=f"Image {image_id} not found")

        original_image = Image.open(image_path).convert('RGB')
        width, height = original_image.size

        # Create ZIP file in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Convert masks to numpy arrays
            masks_np = []
            for mask in masks:
                mask_array = np.array(mask, dtype=np.uint8)
                if mask_array.shape != (height, width):
                    mask_pil = Image.fromarray(mask_array * 255)
                    mask_pil = mask_pil.resize((width, height), Image.NEAREST)
                    mask_array = (np.array(mask_pil) > 128).astype(np.uint8)
                masks_np.append(mask_array)

            # 1. Create overlay visualization with boundaries
            overlay = original_image.copy().convert('RGBA')
            overlay_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))

            for idx, mask in enumerate(masks_np):
                hue = (idx * 360 / max(len(masks_np), 1)) % 360
                saturation = 70 + (idx % 3) * 10
                lightness = 50 + (idx % 2) * 10

                from colorsys import hls_to_rgb
                r, g, b = hls_to_rgb(hue/360, lightness/100, saturation/100)
                fill_color = (int(r*255), int(g*255), int(b*255), 76)  # 30% opacity for fill
                border_color = (int(r*255), int(g*255), int(b*255), 255)  # Full opacity for border

                # Create colored mask (transparent fill)
                colored_mask = Image.new('RGBA', (width, height), (0, 0, 0, 0))
                colored_mask_array = np.array(colored_mask)
                colored_mask_array[mask > 0] = fill_color

                # Detect edges (4-connectivity)
                mask_h, mask_w = mask.shape
                edges = np.zeros_like(mask, dtype=bool)
                for y in range(mask_h):
                    for x in range(mask_w):
                        if mask[y, x] > 0:
                            # Check 4-connected neighbors
                            is_edge = False
                            if x == 0 or x == mask_w - 1 or y == 0 or y == mask_h - 1:
                                is_edge = True
                            elif (mask[y-1, x] == 0 or mask[y+1, x] == 0 or
                                  mask[y, x-1] == 0 or mask[y, x+1] == 0):
                                is_edge = True
                            if is_edge:
                                edges[y, x] = True

                # Draw bright colored borders
                colored_mask_array[edges] = border_color
                colored_mask = Image.fromarray(colored_mask_array)
                overlay_layer = Image.alpha_composite(overlay_layer, colored_mask)

            overlay = Image.alpha_composite(overlay, overlay_layer)

            # Save overlay visualization to ZIP
            overlay_bytes = io.BytesIO()
            overlay.convert('RGB').save(overlay_bytes, format='PNG')
            zip_file.writestr('overlay_visualization.png', overlay_bytes.getvalue())

            # 2. Create overlay with labels (ID at mask center)
            overlay_labeled = overlay.copy()
            draw = ImageDraw.Draw(overlay_labeled)

            # Try to use a nice font with larger size, fallback to default if not available
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
            except:
                try:
                    font = ImageFont.truetype("arial.ttf", 60)
                except:
                    font = ImageFont.load_default()

            # Calculate mask centers and draw labels
            for idx, mask in enumerate(masks_np):
                # Find mask center
                ys, xs = np.where(mask > 0)
                if len(ys) > 0:
                    center_y = int(np.mean(ys))
                    center_x = int(np.mean(xs))

                    # Get darker color for this instance (lower lightness)
                    hue = (idx * 360 / max(len(masks_np), 1)) % 360
                    saturation = 80 + (idx % 3) * 5  # Higher saturation
                    lightness = 30 + (idx % 2) * 5   # Much darker (was 50)
                    from colorsys import hls_to_rgb
                    r, g, b = hls_to_rgb(hue/360, lightness/100, saturation/100)
                    text_color = (int(r*255), int(g*255), int(b*255))

                    # Draw text directly without background box
                    text = str(idx)
                    draw.text((center_x, center_y), text, fill=text_color, font=font, anchor="mm")

            # Save labeled overlay to ZIP
            overlay_labeled_bytes = io.BytesIO()
            overlay_labeled.save(overlay_labeled_bytes, format='PNG')
            zip_file.writestr('overlay_with_labels.png', overlay_labeled_bytes.getvalue())

            # 3. Create combined binary mask
            combined_mask = np.zeros((height, width), dtype=np.uint8)
            for mask in masks_np:
                combined_mask = np.maximum(combined_mask, mask)

            combined_bytes = io.BytesIO()
            Image.fromarray(combined_mask * 255).save(combined_bytes, format='PNG')
            zip_file.writestr('combined_mask.png', combined_bytes.getvalue())

            # 4. Save individual binary masks
            for idx, mask in enumerate(masks_np):
                mask_filename = f"masks/mask_{idx:02d}.png"
                mask_bytes = io.BytesIO()
                Image.fromarray(mask * 255).save(mask_bytes, format='PNG')
                zip_file.writestr(mask_filename, mask_bytes.getvalue())

            # 5. Create metadata JSON
            metadata = {
                "image_id": image_id,
                "prompt": prompt if prompt else "N/A",
                "num_instances": len(masks_np),
                "image_size": {
                    "width": width,
                    "height": height
                },
                "instances": []
            }

            # Add per-instance metadata
            for idx in range(len(masks_np)):
                instance_data = {
                    "id": idx,
                    "score": float(scores[idx]) if idx < len(scores) else None,
                    "box": [float(x) for x in boxes[idx]] if idx < len(boxes) else None,
                    "area": int(np.sum(masks_np[idx] > 0))
                }
                metadata["instances"].append(instance_data)

            # Save metadata JSON to ZIP
            metadata_json = json.dumps(metadata, indent=2)
            zip_file.writestr('metadata.json', metadata_json)

        # Reset buffer position
        zip_buffer.seek(0)

        # Return ZIP file as download
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=segmentation_masks.zip"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

