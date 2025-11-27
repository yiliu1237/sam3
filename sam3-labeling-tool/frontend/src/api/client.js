import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Upload file
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/segment/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Segment image with text
export const segmentImageWithText = async (imageId, prompt, confidenceThreshold = 0.5) => {
  const response = await apiClient.post('/api/segment/image/text', {
    image_id: imageId,
    prompt,
    confidence_threshold: confidenceThreshold,
  });

  return response.data;
};

// Refine segmentation with points
export const refineWithPoints = async (imageId, points, maskId = null) => {
  const response = await apiClient.post('/api/segment/image/refine', {
    image_id: imageId,
    points,
    mask_id: maskId,
  });

  return response.data;
};

// Refine segmentation with box
export const refineWithBox = async (imageId, box) => {
  const response = await apiClient.post('/api/segment/image/refine', {
    image_id: imageId,
    boxes: [box],
  });

  return response.data;
};

// Get video info (metadata)
export const getVideoInfo = async (videoId) => {
  const response = await apiClient.get(`/api/segment/video/info/${videoId}`);
  return response.data;
};

// Segment video with text
export const segmentVideoWithText = async (videoId, prompt, frameIndex = 0, confidenceThreshold = 0.5) => {
  const response = await apiClient.post('/api/segment/video/text', {
    video_id: videoId,
    prompt,
    frame_index: frameIndex,
    confidence_threshold: confidenceThreshold,
  });

  return response.data;
};

// Create batch job
export const createBatchJob = async (inputFolder, outputFolder, prompts, options = {}) => {
  const response = await apiClient.post('/api/batch/process', {
    input_folder: inputFolder,
    output_folder: outputFolder,
    prompts,
    confidence_threshold: options.confidenceThreshold || 0.5,
    export_format: options.exportFormat || 'coco',
    process_videos: options.processVideos || false,
  });

  return response.data;
};

// Get batch job status
export const getBatchJobStatus = async (jobId) => {
  const response = await apiClient.get(`/api/batch/status/${jobId}`);
  return response.data;
};

// Clear file state
export const clearFileState = async (fileId, fileType = 'image') => {
  const response = await apiClient.delete(`/api/segment/clear/${fileId}`, {
    params: { file_type: fileType },
  });

  return response.data;
};

// Export annotations
export const exportAnnotations = async (imageId, format = 'coco', includeVisualization = true) => {
  const response = await apiClient.post('/api/export/annotations', {
    image_id: imageId,
    format,
    include_visualization: includeVisualization,
  });

  return response.data;
};

// Save masks to folder
export const saveMasksToFolder = async (imageId, outputPath, masks, scores = [], boxes = []) => {
  const response = await apiClient.post('/api/segment/save_masks', {
    image_id: imageId,
    output_path: outputPath,
    masks,
    scores,
    boxes,
  });

  return response.data;
};

// Download masks as ZIP file
export const downloadMasksAsZip = async (imageId, masks, scores = [], boxes = [], prompt = '', labels = []) => {
  const response = await apiClient.post('/api/segment/download_masks', {
    image_id: imageId,
    masks,
    scores,
    boxes,
    prompt,
    labels,
  }, {
    responseType: 'blob' // Important for file download
  });

  return response.data;
};

export default apiClient;
