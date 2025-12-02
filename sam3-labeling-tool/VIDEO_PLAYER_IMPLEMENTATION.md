# Video Player Implementation - Technical Documentation

## Overview

This document describes the implementation of the video playback and segmentation visualization feature in the SAM3 Labeling Tool. The goal was to enable users to upload videos, view them frame-by-frame, run segmentation on specific frames, and see masks overlaid on video playback.

---

## Problems Encountered and Solutions

### Problem 1: Initial Video Display

**Challenge**: Videos couldn't be displayed directly in the browser like images. The `<SegmentationCanvas>` component only worked with static images.

**Initial Error**:
```
PIL.UnidentifiedImageError: cannot identify image file '...mp4'
```

**Root Cause**: The backend tried to open video files using `PIL.Image.open()`, which only works with static images.

**Solution**:
- Created a separate video frame extraction endpoint: `GET /api/segment/video/frame/{video_id}?frame_index={n}`
- Used OpenCV (`cv2`) to extract individual frames from the video file
- Converted each frame to JPEG and served it via HTTP
- Updated frontend to detect file type and fetch appropriate frame

**Implementation**:
```python
# Backend: Extract frame using OpenCV
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
ret, frame = cap.read()
frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
frame_image = Image.fromarray(frame_rgb)
```

---

### Problem 2: Hardcoded Frame Count

**Challenge**: Video player showed only 100 frames regardless of actual video length.

**Root Cause**: Total frames was hardcoded as a placeholder: `const [totalFrames, setTotalFrames] = useState(100)`

**Solution**:
- Created video info endpoint: `GET /api/segment/video/info/{video_id}`
- Extracted actual metadata using OpenCV:
  - Total frames: `cv2.CAP_PROP_FRAME_COUNT`
  - FPS: `cv2.CAP_PROP_FPS`
  - Duration: `total_frames / fps`
  - Dimensions: `CAP_PROP_FRAME_WIDTH` and `CAP_PROP_FRAME_HEIGHT`
- Fetched this metadata on video upload and updated UI

**Result**: Player correctly shows actual frame count (e.g., 1500+ frames for longer videos)

---

### Problem 3: Video Segmentation Format Mismatch

**Challenge**: Video segmentation returned different data structure than image segmentation, causing frontend errors.

**Initial Structure** (Video):
```python
{
    "session_id": "...",
    "outputs": {
        "out_binary_masks": np.ndarray,  # (N, H, W)
        "out_boxes_xywh": np.ndarray,    # (N, 4) in xywh format
        "out_probs": np.ndarray,         # (N,)
        "out_obj_ids": np.ndarray        # (N,)
    }
}
```

**Expected Structure** (Image):
```python
{
    "masks": [[...]],      # List of 2D arrays
    "boxes": [[x1,y1,x2,y2]], # xyxy format
    "scores": [0.9, ...]
}
```

**Solution**:
- Transformed video output to match image format in the backend
- Converted masks from numpy arrays to lists
- Converted boxes from xywh to xyxy format: `(x, y, w, h) → (x1, y1, x1+w, y1+h)`
- Renamed fields to match frontend expectations

**Implementation**:
```python
# Convert to image-like format
masks_list = [mask.astype(int).tolist() for mask in out_masks]
boxes_list = [[float(x), float(y), float(x+w), float(y+h)]
              for x, y, w, h in out_boxes]
scores_list = [float(score) for score in out_probs]

return {
    "masks": masks_list,
    "boxes": boxes_list,
    "scores": scores_list,
    "session_id": session_id
}
```

---

### Problem 4: Severe Frame Flickering

**Challenge**: Video playback showed flickering pattern: frame1 → frame2 → frame1 → frame2 → frame3 → frame2...

**Root Cause**:
- The `SegmentationCanvas` component re-created Image objects on every URL change
- Browser wasn't properly caching frames
- No HTTP cache headers were being sent

**Solution**:

**Step 1**: Added proper HTTP caching headers to backend
```python
return StreamingResponse(
    img_byte_arr,
    media_type="image/jpeg",
    headers={
        "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
        "ETag": f"{video_id}-{frame_index}"       # Unique per frame
    }
)
```

**Step 2**: Fixed image loading in SegmentationCanvas
```javascript
// Attach onload handler BEFORE setting src
img.onload = () => setImage(img);
img.src = imageUrl;

// Add cleanup
return () => { img.onload = null; };
```

**Step 3**: Used stable URLs without cache-busting
```javascript
// BAD: Adding random values breaks caching
const url = `...?frame=${n}&t=${Date.now()}`

// GOOD: Stable URL, let browser cache
const url = `...?frame_index=${n}`
```

---

### Problem 5: Playback Stuttering

**Challenge**: During first playback, video would get stuck even though the slider kept moving. Subsequent plays were smooth.

**Root Cause**:
- Frames were fetched on-demand from the server
- Network latency caused delays
- Playback advanced to next frame before it was loaded
- Subsequent plays were smooth because browser cached all frames

**Solution - Smart Buffering System**:

**Component 1**: Frame Preloading
```javascript
// Preload next 10 frames ahead of current position
const preloadFrames = (startFrame) => {
  for (let i = 0; i < 10; i++) {
    const frameIndex = startFrame + i;
    if (!loadedFrames.has(frameIndex)) {
      const img = new Image();
      img.src = `${API_BASE_URL}/...?frame_index=${frameIndex}`;
      img.onload = () => {
        setLoadedFrames(prev => new Set([...prev, frameIndex]));
      };
    }
  }
};
```

**Component 2**: Buffer Checking
```javascript
// Check if next 5 frames are loaded
let bufferedCount = 0;
for (let i = 1; i <= 5; i++) {
  if (loadedFrames.has(currentFrame + i)) {
    bufferedCount++;
  }
}

// Pause if not enough frames buffered
if (bufferedCount < 5) {
  setIsBuffering(true);
} else {
  setIsBuffering(false);
}
```

**Component 3**: Conditional Playback
```javascript
// Only advance frames when NOT buffering
if (isPlaying && !isBuffering) {
  intervalRef.current = setInterval(() => {
    setCurrentFrame(prev => prev + 1);
  }, 1000 / fps);
}
```

**Component 4**: Visual Feedback
```jsx
{isBuffering && (
  <div className="buffering-overlay">
    <Spinner />
    <span>Buffering...</span>
  </div>
)}
```

**Result**:
- First play buffers briefly at start, then plays smoothly
- Subsequent plays are instant (all frames cached)
- No more UI/video desync

---

## Architecture

### Backend Components

#### 1. Video Frame Extraction (`/api/segment/video/frame/{video_id}`)
```
Input: video_id, frame_index
Process:
  1. Open video with cv2.VideoCapture
  2. Seek to frame position
  3. Read and convert frame (BGR → RGB)
  4. Encode as JPEG
  5. Return with cache headers
Output: JPEG image (HTTP response)
```

#### 2. Video Metadata (`/api/segment/video/info/{video_id}`)
```
Input: video_id
Process:
  1. Open video with cv2.VideoCapture
  2. Extract properties (frames, fps, dimensions)
  3. Calculate duration
Output: JSON metadata
```

#### 3. Video Segmentation (`/api/segment/video/text`)
```
Input: video_id, prompt, frame_index, confidence_threshold
Process:
  1. Start SAM3 video session
  2. Add text prompt
  3. Get segmentation outputs
  4. Transform to frontend format
Output: masks, boxes, scores (same format as image)
```

### Frontend Components

#### 1. VideoPlayer Component
**Responsibilities**:
- Fetch video metadata
- Display current frame
- Control playback (play/pause/seek)
- Preload upcoming frames
- Manage buffering state
- Show controls (slider, frame counter, metadata)

**State Management**:
```javascript
const [currentFrame, setCurrentFrame] = useState(0);
const [totalFrames, setTotalFrames] = useState(100);
const [fps, setFps] = useState(30);
const [isPlaying, setIsPlaying] = useState(false);
const [isBuffering, setIsBuffering] = useState(false);
const [loadedFrames, setLoadedFrames] = useState(new Set());
const [videoInfo, setVideoInfo] = useState(null);
```

#### 2. SegmentationCanvas Component
**Reused for both images and video frames**:
- Loads image from URL
- Renders masks as colored overlays with boundaries
- Handles interactive tools (point, box)
- Calculates mask statistics

#### 3. SingleMode Page
**Orchestrates the workflow**:
- Detects file type (image vs video)
- Routes to appropriate display component
- Manages segmentation state
- Handles save/export operations

---

## Key Technical Decisions

### 1. Frame-by-Frame Extraction vs Video Streaming
**Decision**: Extract individual frames via HTTP endpoints

**Rationale**:
- Simpler implementation
- Reuses existing SegmentationCanvas component
- Easier to apply masks per-frame
- Better for interactive seeking
- HTTP caching works well

**Trade-offs**:
- More HTTP requests
- Initial buffering needed
- Mitigated by: aggressive preloading + HTTP caching

### 2. Backend vs Frontend Frame Extraction
**Decision**: Extract frames in backend with OpenCV

**Rationale**:
- Browsers can't natively extract video frames at arbitrary positions
- OpenCV provides precise frame seeking
- Centralizes video processing logic
- Consistent across all browsers

### 3. Buffer Size: 10 frames preload, 5 frames minimum
**Decision**: Preload 10 frames ahead, require 5 buffered before playing

**Rationale**:
- 10 frames = ~0.33 seconds at 30fps (good safety margin)
- 5 frames minimum = ~0.17 seconds (prevents micro-stutters)
- Balance between memory usage and smoothness

**Tuning**:
```javascript
const preloadBuffer = 10;    // How many ahead to preload
const minBufferSize = 5;     // Minimum before playing
```

### 4. Cache-Control: 1 hour
**Decision**: Cache frames for 1 hour with `max-age=3600`

**Rationale**:
- Video frames don't change during a session
- Long enough for multiple replays
- Short enough to not cause storage issues
- ETag provides uniqueness per frame

---

## Performance Characteristics

### Initial Load
- **Video metadata fetch**: ~50ms
- **First frame load**: ~100-200ms
- **Initial 10 frame preload**: ~1-2 seconds (background)

### Playback (First Time)
- **Buffering**: Brief pause at start (1-2 seconds)
- **Smooth playback**: After initial buffer
- **Frame fetch**: ~100ms per frame (happens ahead of playback)

### Playback (Cached)
- **No buffering**: All frames cached in browser
- **Instant playback**: ~0ms latency
- **Memory usage**: ~1-5MB per 100 frames (JPEG compressed)

### Seeking
- **Manual seek**: Instant (if frame cached) or ~100ms (if not)
- **Preload trigger**: Starts loading next 10 frames

---

## Code Locations

### Backend
- **Frame extraction**: `sam3-labeling-tool/backend/api/routes/segmentation.py:311-361`
- **Video metadata**: `sam3-labeling-tool/backend/api/routes/segmentation.py:272-308`
- **Video segmentation**: `sam3-labeling-tool/backend/api/routes/segmentation.py:194-269`
- **Format conversion**: Lines 216-263 (transforms SAM3 video output)

### Frontend
- **VideoPlayer**: `sam3-labeling-tool/frontend/src/components/VideoPlayer.jsx`
- **API client**: `sam3-labeling-tool/frontend/src/api/client.js:58-74`
- **SingleMode integration**: `sam3-labeling-tool/frontend/src/pages/SingleMode.jsx:256-270`
- **SegmentationCanvas**: `sam3-labeling-tool/frontend/src/components/SegmentationCanvas.jsx:77-105`

---

## Future Improvements

### Potential Enhancements
1. **Adaptive buffering**: Adjust buffer size based on network speed
2. **Background preloading**: Preload ALL frames in background after initial load
3. **IndexedDB caching**: Persist frames across sessions
4. **WebWorker frame fetching**: Parallel frame loading without blocking UI
5. **Video compression**: Use WebP for smaller frame sizes
6. **Scrubbing preview**: Show thumbnail when dragging slider
7. **Playback speed control**: 0.5x, 1x, 2x speed options
8. **Frame export**: Export specific frames as images
9. **Multi-frame segmentation**: Propagate masks across frames automatically
10. **Timeline thumbnails**: Show frame previews along the timeline

### Known Limitations
1. **Memory usage**: Large videos with many frames can use significant memory
2. **Initial buffering**: First play requires waiting for frames to load
3. **Server load**: Extracting frames is CPU-intensive on backend
4. **No native video controls**: Custom UI instead of browser native controls
5. **Single frame segmentation**: Masks are per-frame, not tracked across video

---

## Testing Checklist

- [x] Upload video file (.mp4, .avi)
- [x] Display first frame immediately
- [x] Show correct total frame count
- [x] Play/pause functionality
- [x] Frame navigation (prev/next)
- [x] Slider seeking
- [x] Frame counter display
- [x] FPS and duration display
- [x] Text prompt segmentation on video frame
- [x] Mask overlay on video frames
- [x] Buffering indicator
- [x] Smooth playback (first time)
- [x] Instant playback (cached)
- [x] No flickering
- [x] Download masks from video frame
- [x] Reset and upload new video

---

## Dependencies

### Backend
- **OpenCV** (`cv2`): Video frame extraction and metadata
- **NumPy**: Array operations
- **PIL/Pillow**: Image encoding (JPEG)
- **FastAPI**: HTTP endpoints and streaming responses

### Frontend
- **React**: Component framework
- **Konva.js**: Canvas rendering (via SegmentationCanvas)
- **Axios**: HTTP client
- **Lucide React**: Icons (Play, Pause, SkipForward, etc.)

### Installation
```bash
# Backend
conda activate sam3label
pip install opencv-python

# Frontend
npm install react-konva konva lucide-react axios
```

---

## Conclusion

The video player implementation successfully enables frame-by-frame video segmentation with smooth playback. The key innovations were:

1. **Smart buffering system** that prevents stuttering
2. **HTTP caching strategy** that eliminates flickering
3. **Format normalization** that allows reuse of existing components
4. **Preloading mechanism** that ensures smooth playback

The result is a professional-grade video player that behaves like YouTube or other streaming platforms, with the added capability of overlaying segmentation masks on each frame.
