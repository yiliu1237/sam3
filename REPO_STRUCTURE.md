# SAM 3 Repository Structure

## Overview

SAM 3 (Segment Anything Model 3) is Meta's foundation model for promptable segmentation in images and videos. It can detect, segment, and track objects using text or visual prompts (points, boxes, masks).

**Key Innovation**: Open-vocabulary concept segmentation - handles 270K+ unique concepts, 50x more than existing benchmarks.

**Model Size**: 848M parameters

**Performance**: Achieves 75-80% of human performance on SA-CO benchmark

## Directory Structure

```
sam3/
├── sam3/                      # Main package
│   ├── model/                 # Core model implementation
│   ├── agent/                 # LLM-powered agent for complex prompts
│   ├── eval/                  # Evaluation toolkit
│   ├── train/                 # Training infrastructure
│   ├── sam/                   # Legacy SAM components
│   ├── perflib/               # Performance optimizations
│   └── visualization_utils.py # Visualization helpers
├── examples/                  # Jupyter notebook examples (11 notebooks)
├── scripts/                   # Evaluation and data processing scripts
├── assets/                    # Documentation images and sample data
└── .github/                   # GitHub workflows

```

## Core Package (`sam3/`)

### `model/` - Model Implementation

**Core Model Files:**
- `sam3_image.py` - Image segmentation model
- `sam3_video_base.py` - Base video model
- `sam3_video_predictor.py` - Video prediction interface
- `sam3_video_inference.py` - Video inference logic
- `sam3_tracking_predictor.py` - Object tracking
- `sam3_tracker_base.py` - Tracker base class
- `sam3_tracker_utils.py` - Tracker utilities

**Architecture Components:**
- `encoder.py` - Vision encoder (ViT-based)
- `decoder.py` - Mask decoder
- `text_encoder_ve.py` - Text encoding
- `tokenizer_ve.py` - Text tokenization
- `geometry_encoders.py` - Spatial prompt encoding (points, boxes)
- `position_encoding.py` - Positional embeddings
- `vl_combiner.py` - Vision-language feature combination

**Processor & Utilities:**
- `sam3_image_processor.py` - Image processing API
- `memory.py` - Video memory management
- `box_ops.py` - Bounding box operations
- `data_misc.py` - Data preprocessing
- `io_utils.py` - I/O utilities
- `model_misc.py` - Model helpers
- `necks.py` - Feature pyramid necks
- `vitdet.py` - Vision Transformer detector

**Legacy Support:**
- `sam1_task_predictor.py` - SAM 1 compatibility
- `utils/sam1_utils.py` - SAM 1 utilities
- `utils/sam2_utils.py` - SAM 2 utilities

**Specialized:**
- `maskformer_segmentation.py` - MaskFormer integration
- `edt.py` - Euclidean distance transform
- `act_ckpt_utils.py` - Activation checkpointing

### `agent/` - LLM Agent

**Core Agent:**
- `agent_core.py` - Main agent logic
- `inference.py` - Agent inference pipeline
- `viz.py` - Agent visualization

**Clients:**
- `client_llm.py` - LLM API client
- `client_sam3.py` - SAM3 model client

**System Prompts:**
- `system_prompts/system_prompt.txt` - Base prompt
- `system_prompts/system_prompt_iterative_checking.txt` - Iterative refinement prompt

**Helpers (`agent/helpers/`):**
- `boxes.py` - Box manipulation
- `masks.py` - Mask operations
- `memory.py` - Agent memory management
- `roi_align.py` - ROI alignment
- `visualizer.py` - Visualization utilities
- `zoom_in.py` - Image zooming
- `keypoints.py` - Keypoint handling
- `rotated_boxes.py` - Rotated bounding boxes
- `rle.py` - Run-length encoding
- `color_map.py` - Color mapping
- `mask_overlap_removal.py` - Overlap handling
- `som_utils.py` - Set-of-Mark utilities

### `eval/` - Evaluation Toolkit

**Metrics:**
- `cgf1_eval.py` - Concept-grounded F1 metric
- `coco_eval.py` - COCO evaluation (online)
- `coco_eval_offline.py` - COCO evaluation (offline)
- `demo_eval.py` - Demo evaluation

**SA-Co Video Evaluation:**
- `saco_veval_eval.py` - Video evaluation
- `saco_veval_evaluators.py` - Video evaluators

**Utilities:**
- `conversion_util.py` - Format conversion
- `coco_writer.py` - COCO format writer
- `coco_reindex.py` - COCO reindexing
- `postprocessors.py` - Post-processing
- `ytvis_eval.py` - YouTube-VIS evaluation
- `ytvis_coco_wrapper.py` - YouTube-VIS wrapper

**HOTA Evaluation Toolkit (`eval/hota_eval_toolkit/`):**
- `run_ytvis_eval.py` - YouTube-VIS HOTA evaluation
- `trackeval/` - Tracking evaluation library
  - `datasets/` - Dataset loaders (TAO, YouTube-VIS)
  - `metrics/` - Metrics (HOTA, count)
  - `eval.py` - Evaluation runner

**TETA Evaluation Toolkit (`eval/teta_eval_toolkit/`):**
- `eval.py` - TETA evaluation runner
- `datasets/` - Dataset loaders (COCO, TAO)
- `metrics/` - TETA metric implementation

### `train/` - Training Infrastructure

**Configuration:**
- `configs/` - Training configurations
  - `gold_image_evals/` - SA-Co/Gold configs
  - `silver_image_evals/` - SA-Co/Silver configs
  - `saco_video_evals/` - SA-Co/VEval configs
  - `roboflow_v100/` - Roboflow configs
  - `odinw13/` - ODINW13 configs

**Training Components:**
- `data/` - Data loaders and datasets
- `loss/` - Loss functions
- `optim/` - Optimizers
- `transforms/` - Data augmentation
- `utils/` - Training utilities

### `sam/` - Legacy SAM Components

- `transformer.py` - Transformer architecture
- `mask_decoder.py` - Mask decoder
- `prompt_encoder.py` - Prompt encoder
- `rope.py` - Rotary position embeddings
- `common.py` - Common utilities

### `perflib/` - Performance Optimizations

- `compile.py` - Model compilation
- `fa3.py` - Flash Attention 3
- `nms.py` - Non-maximum suppression
- `masks_ops.py` - Optimized mask operations
- `connected_components.py` - Connected components
- `associate_det_trk.py` - Detection-tracking association
- `tests/tests.py` - Performance tests

## Examples (`examples/`)

### Image Examples
1. **`sam3_image_predictor_example.ipynb`** - Text and visual box prompts on images
2. **`sam3_image_batched_inference.ipynb`** - Batched inference on images
3. **`sam3_image_interactive.ipynb`** - Interactive image segmentation

### Video Examples
4. **`sam3_video_predictor_example.ipynb`** - Text prompts on videos with point refinement

### Agent Example
5. **`sam3_agent.ipynb`** - Complex text prompts using LLM agent

### Legacy Task Examples
6. **`sam3_for_sam1_task_example.ipynb`** - SAM 1 compatibility (interactive segmentation)
7. **`sam3_for_sam2_video_task_example.ipynb`** - SAM 2 compatibility (video segmentation)

### SA-Co Dataset Examples
8. **`saco_gold_silver_vis_example.ipynb`** - SA-Co image dataset visualization
9. **`saco_gold_silver_eval_example.ipynb`** - SA-Co image evaluation
10. **`saco_veval_vis_example.ipynb`** - SA-Co video dataset visualization
11. **`saco_veval_eval_example.ipynb`** - SA-Co video evaluation

## Scripts (`scripts/`)

### Evaluation Scripts

**Gold Benchmark (`scripts/eval/gold/`):**
- `eval_sam3.py` - Evaluate SAM 3 on SA-Co/Gold
- `README.md` - Gold benchmark documentation

**Silver Benchmark (`scripts/eval/silver/`):**
- `download_*.py` - Download scripts for various datasets:
  - `download_inaturalist.py`
  - `download_fathomnet.py`
  - `download_preprocess_nga.py`
  - `download_videos.py`
- `extract_frames.py` - Extract frames from videos
- `preprocess_*.py` - Preprocessing scripts
- `utils.py` - Utility functions
- `CONFIG_FRAMES.yaml` - Frame extraction config
- `*.json` - Dataset subsets
- `README.md` - Silver benchmark documentation

**Video Evaluation (`scripts/eval/veval/`):**
- `saco_yt1b_downloader.py` - YouTube-1B downloader
- `saco_yt1b_frame_prep_util.py` - Frame preparation
- `saco_yt1b_annot_update.py` - Annotation updates
- `README.md` - VEval documentation

**Standalone Evaluation:**
- `standalone_cgf1.py` - Standalone cgF1 evaluation

### Result Extraction
- `extract_roboflow_vl100_results.py` - Extract Roboflow VL100 results
- `extract_odinw_results.py` - Extract ODINW results

## Key Entry Points

### Model Building (`model_builder.py`)

```python
# Image model
build_sam3_image_model()

# Video predictor
build_sam3_video_predictor()
```

### Package Initialization (`__init__.py`)

- Version information
- Package-level exports

## Architecture Overview

### Detector-Tracker Design

**Shared Components:**
- Vision encoder (ViT-based, shared between detector and tracker)

**Detector:**
- DETR-based architecture
- Supports text, geometry (points/boxes), and image exemplar prompts
- **Presence token** for fine-grained text discrimination (e.g., "player in white" vs "player in red")

**Tracker:**
- Inherits SAM 2 transformer encoder-decoder architecture
- Supports video segmentation and interactive refinement
- Memory-based tracking across frames

## Benchmarks & Datasets

### SA-Co Dataset (270K unique concepts)

**SA-Co/Gold** - High-quality image benchmark
- Location: `scripts/eval/gold/`
- HuggingFace: `facebook/SACo-Gold`
- Roboflow: `universe.roboflow.com/sa-co-gold`

**SA-Co/Silver** - Extended image benchmark
- Location: `scripts/eval/silver/`
- HuggingFace: `facebook/SACo-Silver`
- Roboflow: `universe.roboflow.com/sa-co-silver`

**SA-Co/VEval** - Video benchmark
- Location: `scripts/eval/veval/`
- HuggingFace: `facebook/SACo-VEval`
- Roboflow: `universe.roboflow.com/sa-co-veval`

### Other Supported Benchmarks
- LVIS - Instance segmentation
- COCO - Object detection
- BURST - Video tracking
- LVVIS - Long-form video instance segmentation
- YT-Temporal-1B - YouTube temporal annotations
- ODINW13 - 13 detection datasets
- Roboflow VL100 - 100 vision-language tasks

## API Patterns

### Image Segmentation

```python
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor

model = build_sam3_image_model()
processor = Sam3Processor(model)

# Set image
inference_state = processor.set_image(image)

# Text prompt
output = processor.set_text_prompt(state=inference_state, prompt="your prompt")
masks, boxes, scores = output["masks"], output["boxes"], output["scores"]
```

### Video Segmentation

```python
from sam3.model_builder import build_sam3_video_predictor

predictor = build_sam3_video_predictor()

# Start session
response = predictor.handle_request({
    "type": "start_session",
    "resource_path": video_path
})

# Add text prompt
response = predictor.handle_request({
    "type": "add_prompt",
    "session_id": response["session_id"],
    "frame_index": 0,
    "text": "your prompt"
})
```

## Dependencies

### Core Dependencies
- PyTorch 2.7+ (with CUDA 12.6+)
- Python 3.12+
- timm >= 1.0.17
- numpy == 1.26
- huggingface_hub

### Optional Dependencies
- **notebooks**: matplotlib, jupyter, ipywidgets, opencv-python, decord
- **dev**: pytest, black, ufmt, ruff-api, pandas, pycocotools
- **train**: hydra-core, submitit, tensorboard, fairscale, torchmetrics

## Performance Features

- Flash Attention 3 support (`perflib/fa3.py`)
- Activation checkpointing for memory efficiency
- Compiled model support (`perflib/compile.py`)
- Optimized mask operations
- Batched inference support

## Development

### Code Formatting
```bash
ufmt format .
```

### Running Tests
```bash
pytest
```

### Training
See `README_TRAIN.md` for training documentation.

## License

SAM License - see LICENSE file

## Repository Links

- **Homepage**: https://github.com/facebookresearch/sam3
- **Project Page**: https://ai.meta.com/sam3
- **Demo**: https://segment-anything.com/
- **Paper**: https://ai.meta.com/research/publications/sam-3-segment-anything-with-concepts/
- **Blog**: https://ai.meta.com/blog/segment-anything-model-3/
- **HuggingFace**: https://huggingface.co/facebook/sam3

## Notes

- Requires HuggingFace authentication to download model checkpoints
- Achieves 75-80% of human performance on SA-CO benchmark
- 50x more concepts than existing benchmarks (270K vs ~5K)
- Innovative data engine annotated 4M+ unique concepts
- Supports both programmatic API and LLM-agent interface
