# SAM 3 Labeling Tool

A modern, beautiful web-based labeling tool powered by SAM 3 (Segment Anything Model 3) for automated image and video segmentation with text prompts and interactive refinement.

![SAM 3 Labeling Tool](https://img.shields.io/badge/SAM-3-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688)

## Features

### Dual Mode Operation

- **Single Mode**: Upload and segment individual images/videos with real-time interaction
- **Batch Mode**: Process entire folders of images/videos automatically

### Powered by SAM 3

- Text-based prompting (e.g., "crack", "person", "car")
- Open-vocabulary segmentation (270K+ concepts)
- High-quality instance segmentation
- Video object tracking

### Interactive Refinement

- **Point Tool**: Add positive/negative points to refine masks
- **Box Tool**: Draw bounding boxes for precise selection
- **Real-time Updates**: See segmentation changes instantly

### Batch Processing

- Process folders with hundreds/thousands of images
- Multiple text prompts per batch
- Progress tracking with live updates
- Export in COCO JSON, Mask PNG, or both

### Beautiful UI

- Clean, modern interface with dark/light themes
- Responsive design
- Smooth animations
- Toast notifications
- Professional color scheme

## Architecture

```
sam3-labeling-tool/
├── backend/                 # FastAPI backend
│   ├── api/
│   │   ├── routes/         # API endpoints
│   │   └── models.py       # Pydantic models
│   ├── services/
│   │   ├── sam3_service.py # SAM 3 integration
│   │   ├── batch_processor.py
│   │   └── storage.py
│   └── requirements.txt
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Main pages
│   │   ├── api/            # API client
│   │   └── store/          # State management
│   └── package.json
│
└── data/                    # Data storage
    ├── uploads/
    ├── outputs/
    └── temp/
```

## Installation

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **CUDA-compatible GPU** (recommended)
- **SAM 3 model checkpoints** (HuggingFace authentication required)

### 1. Clone the Repository

```bash
cd /path/to/sam3
cd sam3-labeling-tool
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install SAM 3 (from parent directory)
pip install -e ../../
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### 4. HuggingFace Authentication

SAM 3 requires authentication to download model checkpoints:

```bash
# Install huggingface-cli if not already installed
pip install huggingface_hub

# Login to HuggingFace
huggingface-cli login
```

Then request access to the SAM 3 model at: https://huggingface.co/facebook/sam3

## Running the Application

### Start Backend Server

```bash
cd backend
source venv/bin/activate  # Activate virtual environment

# Run with uvicorn
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

API docs available at: `http://localhost:8000/docs`

### Start Frontend Development Server

```bash
cd frontend

# Run Vite dev server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Usage

### Single Mode

1. Navigate to **Single Mode** tab
2. **Upload** an image or video file
3. Enter a **text prompt** (e.g., "crack", "person", "car")
4. Click **Segment** to run SAM 3
5. **Refine** results using:
   - **Point Tool**: Click to add positive (green) or negative (red) points
   - **Box Tool**: Draw bounding boxes
6. **Export** results in COCO format

### Batch Mode

1. Navigate to **Batch Mode** tab
2. Specify **Input Folder** (containing images/videos)
3. Specify **Output Folder** (for results)
4. Add **Text Prompts** (one or more)
5. Configure:
   - Export format (COCO, Mask PNG, or both)
   - Confidence threshold
   - Process videos option
6. Click **Start Batch Processing**
7. Monitor progress in real-time
8. **Download** results when complete

## API Endpoints

### Segmentation

- `POST /api/segment/upload` - Upload file
- `POST /api/segment/image/text` - Segment with text prompt
- `POST /api/segment/image/refine` - Refine with points/boxes
- `POST /api/segment/video/text` - Segment video
- `DELETE /api/segment/clear/{file_id}` - Clear cached state

### Batch Processing

- `POST /api/batch/process` - Create batch job
- `GET /api/batch/status/{job_id}` - Get job status

### Export

- `POST /api/export/annotations` - Export annotations
- `GET /api/export/download/{job_id}` - Download batch results

## Configuration

### Backend Settings

Edit `backend/api/main.py` to configure:

- CORS origins
- Upload limits
- Storage paths

### Frontend Settings

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:8000
```

## Tech Stack

### Backend

- **FastAPI** - Modern, fast web framework
- **SAM 3** - Meta's foundation model for segmentation
- **PyTorch** - Deep learning framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

### Frontend

- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Utility-first CSS
- **Konva.js** - Canvas manipulation
- **Zustand** - State management
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **Lucide React** - Icons

## Project Structure Details

### Backend Services

- **sam3_service.py**: Wraps SAM 3 models for inference
- **batch_processor.py**: Handles batch job creation and processing
- **storage.py**: Manages file uploads and outputs

### Frontend Components

- **Header**: Navigation and theme toggle
- **ImageUploader**: Drag & drop file upload
- **SegmentationCanvas**: Interactive canvas with Konva.js
- **ToolPanel**: Tool selection and controls
- **ToastContainer**: Notification system

### Frontend Pages

- **SingleMode**: Single image/video segmentation interface
- **BatchMode**: Batch processing interface

## Performance Tips

1. **GPU Acceleration**: Ensure CUDA is properly configured for faster inference
2. **Batch Size**: For large batches, consider processing in chunks
3. **Confidence Threshold**: Adjust to filter low-quality predictions
4. **Memory Management**: Clear file states after processing to free memory

## Troubleshooting

### Backend Issues

**Model download fails:**
```bash
# Ensure HuggingFace authentication
huggingface-cli login
```

**CUDA out of memory:**
- Reduce image resolution
- Clear cached states
- Process smaller batches

### Frontend Issues

**API connection fails:**
- Check backend is running on port 8000
- Verify CORS settings in `backend/api/main.py`

**Canvas rendering issues:**
- Update browser to latest version
- Check WebGL support

## Development

### Backend Development

```bash
cd backend

# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black .
```

### Frontend Development

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker Deployment (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - CUDA_VISIBLE_DEVICES=0

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Run with:
```bash
docker-compose up
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project uses SAM 3, which is licensed under the SAM License. See the main SAM 3 repository for details.

## Acknowledgments

- **Meta AI** for SAM 3 model
- **FastAPI** team for the excellent framework
- **React** and **Vite** communities

## Contact & Support

For issues and questions:
- Open an issue on GitHub
- Check SAM 3 documentation: https://ai.meta.com/sam3

---

**Built with using SAM 3, React, and FastAPI**
