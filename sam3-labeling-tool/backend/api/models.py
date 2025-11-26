from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class PromptType(str, Enum):
    TEXT = "text"
    POINT = "point"
    BOX = "box"
    MASK = "mask"


class Point(BaseModel):
    x: float
    y: float
    label: int = Field(1, description="1 for positive, 0 for negative")


class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class TextPromptRequest(BaseModel):
    image_id: str
    prompt: str
    confidence_threshold: Optional[float] = 0.5


class RefinePromptRequest(BaseModel):
    image_id: str
    mask_id: Optional[int] = None
    points: Optional[List[Point]] = None
    boxes: Optional[List[BBox]] = None


class VideoSegmentRequest(BaseModel):
    video_id: str
    prompt: str
    frame_index: int = 0
    confidence_threshold: Optional[float] = 0.5


class BatchProcessRequest(BaseModel):
    input_folder: str
    output_folder: str
    prompts: List[str]
    confidence_threshold: Optional[float] = 0.5
    export_format: str = Field("coco", description="coco, mask_png, or both")
    process_videos: bool = False


class SegmentationResult(BaseModel):
    masks: List[List[List[int]]]  # List of binary masks
    boxes: List[List[float]]  # List of bounding boxes [x1, y1, x2, y2]
    scores: List[float]
    labels: Optional[List[str]] = None


class BatchJobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: float  # 0.0 to 1.0
    total_files: int
    processed_files: int
    current_file: Optional[str] = None
    error: Optional[str] = None


class ExportRequest(BaseModel):
    image_id: str
    format: str = Field("coco", description="coco, yolo, mask_png, or all")
    include_visualization: bool = True
