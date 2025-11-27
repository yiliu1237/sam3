import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Optional, Tuple, Any
import sys
import os

# Add parent directory to path to import sam3
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../'))

from sam3.model_builder import build_sam3_image_model, build_sam3_video_predictor
from sam3.model.sam3_image_processor import Sam3Processor


class SAM3Service:
    """Service class for SAM 3 model inference"""

    def __init__(self, device: str = None):
        """Initialize SAM 3 models"""
        if device is None:
            # Prefer CUDA, fallback to MPS on macOS, then CPU
            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device

        print(f"Initializing SAM 3 on device: {self.device}")

        try:
            # Try to find local checkpoint first, then fall back to environment variable or HuggingFace
            default_checkpoint_path = os.path.join(
                os.path.dirname(__file__), '../../../checkpoints/sam3/sam3.pt'
            )

            if os.path.exists(default_checkpoint_path):
                checkpoint_path = default_checkpoint_path
                load_from_hf = False
                print(f"Using local checkpoint: {checkpoint_path}")
            else:
                # Fall back to environment variable or HuggingFace
                checkpoint_path = os.environ.get("SAM3_CHECKPOINT_PATH", None)
                load_from_hf = checkpoint_path is None
                if checkpoint_path:
                    print(f"Using checkpoint from environment: {checkpoint_path}")
                else:
                    print("No local checkpoint found, will download from HuggingFace")

            # Initialize image model with explicit device
            self.image_model = build_sam3_image_model(
                device=self.device,
                checkpoint_path=checkpoint_path,
                load_from_HF=load_from_hf
            )
            self.image_model = self.image_model.to(self.device)
            self.image_processor = Sam3Processor(self.image_model)

            # Initialize video predictor
            # Build the video model first, then wrap it in the predictor
            from sam3.model_builder import build_sam3_video_model

            video_checkpoint = checkpoint_path if not load_from_hf else None
            video_model = build_sam3_video_model(
                checkpoint_path=video_checkpoint,
                load_from_HF=load_from_hf,
                device=self.device
            )

            self.video_predictor = build_sam3_video_predictor(
                model=video_model,
                gpus_to_use=None  # Will use default device
            )

            # Store active sessions
            self.image_states = {}  # image_id -> inference_state
            self.video_sessions = {}  # video_id -> session_id

            print(f"SAM 3 models loaded successfully on {self.device}")
        except Exception as e:
            print(f"Error loading SAM3 models: {e}")
            raise

    def segment_image_with_text(
        self,
        image: Image.Image,
        prompt: str,
        image_id: str,
        confidence_threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Segment an image using text prompt

        Args:
            image: PIL Image
            prompt: Text prompt for segmentation
            image_id: Unique identifier for the image
            confidence_threshold: Minimum confidence score

        Returns:
            Dictionary with masks, boxes, and scores
        """
        # Set the image
        inference_state = self.image_processor.set_image(image)

        # Store the state for refinement
        self.image_states[image_id] = inference_state

        # Run text prompt segmentation
        output = self.image_processor.set_text_prompt(
            state=inference_state,
            prompt=prompt
        )

        # Filter by confidence threshold
        masks = output["masks"]
        boxes = output["boxes"]
        scores = output["scores"]

        # Filter low confidence predictions
        filtered_indices = [i for i, score in enumerate(scores) if score >= confidence_threshold]

        # Squeeze masks to remove extra dimensions (N, 1, H, W) -> list of (H, W)
        # masks is a single tensor with shape (N, 1, H, W), we need to convert to list of 2D arrays
        if len(filtered_indices) > 0:
            filtered_masks_tensor = masks[filtered_indices]  # Shape: (num_filtered, 1, H, W)
            filtered_masks = [filtered_masks_tensor[i].squeeze() for i in range(len(filtered_indices))]  # List of (H, W)
        else:
            filtered_masks = []

        filtered_boxes = [boxes[i] for i in filtered_indices]
        filtered_scores = [scores[i] for i in filtered_indices]

        return {
            "masks": filtered_masks,
            "boxes": filtered_boxes,
            "scores": filtered_scores,
            "prompt": prompt
        }

    def refine_with_points(
        self,
        image_id: str,
        points: List[Tuple[float, float]],
        labels: List[int],
        mask_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Refine segmentation with point prompts

        Args:
            image_id: Image identifier
            points: List of (x, y) coordinates
            labels: List of labels (1 for positive, 0 for negative)
            mask_id: Optional mask ID to refine

        Returns:
            Updated segmentation results
        """
        if image_id not in self.image_states:
            raise ValueError(f"Image {image_id} not found. Please segment with text first.")

        state = self.image_states[image_id]

        # Add point prompts
        output = self.image_processor.add_point_prompt(
            state=state,
            points=np.array(points),
            labels=np.array(labels)
        )

        # Squeeze masks to remove extra dimensions (N, 1, H, W) -> list of (H, W)
        masks_tensor = output["masks"]
        if masks_tensor.shape[0] > 0:
            masks = [masks_tensor[i].squeeze() for i in range(masks_tensor.shape[0])]
        else:
            masks = []

        return {
            "masks": masks,
            "boxes": output["boxes"],
            "scores": output["scores"]
        }

    def refine_with_box(
        self,
        image_id: str,
        box: Tuple[float, float, float, float]
    ) -> Dict[str, Any]:
        """
        Refine segmentation with box prompt

        Args:
            image_id: Image identifier
            box: Bounding box (x1, y1, x2, y2)

        Returns:
            Updated segmentation results
        """
        if image_id not in self.image_states:
            raise ValueError(f"Image {image_id} not found. Please segment with text first.")

        state = self.image_states[image_id]

        # Add box prompt
        output = self.image_processor.add_box_prompt(
            state=state,
            box=np.array(box)
        )

        # Squeeze masks to remove extra dimensions (N, 1, H, W) -> list of (H, W)
        masks_tensor = output["masks"]
        if masks_tensor.shape[0] > 0:
            masks = [masks_tensor[i].squeeze() for i in range(masks_tensor.shape[0])]
        else:
            masks = []

        return {
            "masks": masks,
            "boxes": output["boxes"],
            "scores": output["scores"]
        }

    def segment_video_with_text(
        self,
        video_path: str,
        prompt: str,
        video_id: str,
        frame_index: int = 0,
        confidence_threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Segment a video using text prompt

        Args:
            video_path: Path to video file or JPEG folder
            prompt: Text prompt for segmentation
            video_id: Unique identifier for the video
            frame_index: Frame to start segmentation
            confidence_threshold: Minimum confidence score

        Returns:
            Dictionary with segmentation results
        """
        # Start a session
        response = self.video_predictor.handle_request(
            request=dict(
                type="start_session",
                resource_path=video_path,
            )
        )

        session_id = response["session_id"]
        self.video_sessions[video_id] = session_id

        # Add text prompt
        response = self.video_predictor.handle_request(
            request=dict(
                type="add_prompt",
                session_id=session_id,
                frame_index=frame_index,
                text=prompt,
            )
        )

        output = response["outputs"]

        return {
            "session_id": session_id,
            "outputs": output,
            "prompt": prompt
        }

    def clear_image_state(self, image_id: str):
        """Clear stored image state to free memory"""
        if image_id in self.image_states:
            del self.image_states[image_id]

    def clear_video_session(self, video_id: str):
        """Clear video session"""
        if video_id in self.video_sessions:
            session_id = self.video_sessions[video_id]
            # End the session
            self.video_predictor.handle_request(
                request=dict(
                    type="end_session",
                    session_id=session_id
                )
            )
            del self.video_sessions[video_id]


# Global instance
_sam3_service = None


def get_sam3_service() -> SAM3Service:
    """Get or create SAM3Service singleton"""
    global _sam3_service
    if _sam3_service is None:
        _sam3_service = SAM3Service()
    return _sam3_service

