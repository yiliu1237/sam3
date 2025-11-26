import os
import json
import uuid
from pathlib import Path
from typing import List, Dict, Any
from PIL import Image
import numpy as np
from datetime import datetime

from .sam3_service import get_sam3_service
from .storage import get_storage_service


class BatchProcessor:
    """Handle batch processing of images and videos"""

    def __init__(self):
        self.sam3_service = get_sam3_service()
        self.storage_service = get_storage_service()
        self.jobs = {}  # job_id -> job_info

    def create_job(
        self,
        input_folder: str,
        output_folder: str,
        prompts: List[str],
        confidence_threshold: float = 0.5,
        export_format: str = "coco",
        process_videos: bool = False
    ) -> str:
        """
        Create a batch processing job

        Args:
            input_folder: Path to input folder
            output_folder: Path to output folder
            prompts: List of text prompts
            confidence_threshold: Minimum confidence score
            export_format: Export format (coco, mask_png, both)
            process_videos: Whether to process videos

        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())

        # Get files to process
        extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        if process_videos:
            extensions.extend(['.mp4', '.avi', '.mov'])

        files = self.storage_service.get_files_in_folder(input_folder, extensions)

        # Create output folder
        output_path = self.storage_service.create_output_folder(
            f"batch_{job_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )

        # Store job info
        self.jobs[job_id] = {
            'job_id': job_id,
            'status': 'pending',
            'progress': 0.0,
            'total_files': len(files),
            'processed_files': 0,
            'current_file': None,
            'error': None,
            'input_folder': input_folder,
            'output_folder': output_path,
            'prompts': prompts,
            'confidence_threshold': confidence_threshold,
            'export_format': export_format,
            'files': files,
            'results': []
        }

        return job_id

    def process_job(self, job_id: str):
        """
        Process a batch job

        Args:
            job_id: Job ID
        """
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")

        job = self.jobs[job_id]
        job['status'] = 'processing'

        files = job['files']
        prompts = job['prompts']
        output_folder = job['output_folder']
        confidence_threshold = job['confidence_threshold']
        export_format = job['export_format']

        coco_annotations = {
            'images': [],
            'annotations': [],
            'categories': []
        }

        # Create categories from prompts
        for idx, prompt in enumerate(prompts):
            coco_annotations['categories'].append({
                'id': idx + 1,
                'name': prompt,
                'supercategory': 'object'
            })

        annotation_id = 1

        try:
            for file_idx, file_path in enumerate(files):
                job['current_file'] = os.path.basename(file_path)

                # Load image
                image = Image.open(file_path).convert('RGB')
                image_id = f"batch_{file_idx}"

                # Add to COCO images
                coco_annotations['images'].append({
                    'id': file_idx,
                    'file_name': os.path.basename(file_path),
                    'width': image.width,
                    'height': image.height
                })

                # Process each prompt
                for prompt_idx, prompt in enumerate(prompts):
                    try:
                        # Segment with SAM 3
                        result = self.sam3_service.segment_image_with_text(
                            image=image,
                            prompt=prompt,
                            image_id=image_id,
                            confidence_threshold=confidence_threshold
                        )

                        # Save results
                        masks = result['masks']
                        boxes = result['boxes']
                        scores = result['scores']

                        # Save masks if requested
                        if export_format in ['mask_png', 'both']:
                            mask_folder = os.path.join(output_folder, 'masks', prompt)
                            os.makedirs(mask_folder, exist_ok=True)

                            for mask_idx, mask in enumerate(masks):
                                mask_filename = f"{Path(file_path).stem}_{prompt}_{mask_idx}.png"
                                mask_path = os.path.join(mask_folder, mask_filename)

                                # Save mask
                                mask_array = np.array(mask)
                                mask_image = Image.fromarray((mask_array * 255).astype('uint8'))
                                mask_image.save(mask_path)

                        # Add to COCO annotations
                        if export_format in ['coco', 'both']:
                            for mask_idx, (mask, box, score) in enumerate(zip(masks, boxes, scores)):
                                # Convert mask to RLE or polygon (simplified here)
                                mask_array = np.array(mask)

                                # Get bounding box
                                x1, y1, x2, y2 = box
                                width = x2 - x1
                                height = y2 - y1

                                coco_annotations['annotations'].append({
                                    'id': annotation_id,
                                    'image_id': file_idx,
                                    'category_id': prompt_idx + 1,
                                    'bbox': [float(x1), float(y1), float(width), float(height)],
                                    'area': float(width * height),
                                    'iscrowd': 0,
                                    'score': float(score)
                                })

                                annotation_id += 1

                        # Clear state to free memory
                        self.sam3_service.clear_image_state(image_id)

                    except Exception as e:
                        print(f"Error processing {file_path} with prompt '{prompt}': {e}")
                        continue

                # Update progress
                job['processed_files'] = file_idx + 1
                job['progress'] = (file_idx + 1) / job['total_files']

            # Save COCO annotations
            if export_format in ['coco', 'both']:
                coco_path = os.path.join(output_folder, 'annotations.json')
                with open(coco_path, 'w') as f:
                    json.dump(coco_annotations, f, indent=2)

            job['status'] = 'completed'
            job['progress'] = 1.0

        except Exception as e:
            job['status'] = 'failed'
            job['error'] = str(e)
            print(f"Batch job {job_id} failed: {e}")

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status"""
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")

        job = self.jobs[job_id]

        return {
            'job_id': job['job_id'],
            'status': job['status'],
            'progress': job['progress'],
            'total_files': job['total_files'],
            'processed_files': job['processed_files'],
            'current_file': job['current_file'],
            'error': job['error']
        }


# Global instance
_batch_processor = None


def get_batch_processor() -> BatchProcessor:
    """Get or create BatchProcessor singleton"""
    global _batch_processor
    if _batch_processor is None:
        _batch_processor = BatchProcessor()
    return _batch_processor
