import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import SegmentationCanvas from '../components/SegmentationCanvas';
import ToolPanel from '../components/ToolPanel';
import useStore from '../store/useStore';
import {
  uploadFile,
  segmentImageWithText,
  segmentVideoWithText,
  refineWithPoints,
  refineWithBox,
  exportAnnotations,
  downloadMasksAsZip,
} from '../api/client';

const SingleMode = () => {
  const [imagePreview, setImagePreview] = useState(null);

  const {
    currentFileId,
    currentFileType,
    setCurrentFile,
    clearCurrentFile,
    textPrompt,
    setTextPrompt,
    segmentationResult,
    setSegmentationResult,
    isLoading,
    setIsLoading,
    confidenceThreshold,
    refinementPoints,
    addRefinementPoint,
    clearRefinementPoints,
    addToast,
  } = useStore();

  // Handle file selection
  const handleFileSelect = async (file) => {
    try {
      setIsLoading(true);

      // Upload file first
      const result = await uploadFile(file);
      setCurrentFile(file, result.file_id, result.file_type);

      // Create preview based on file type
      if (result.file_type === 'video') {
        // For videos, fetch the first frame as preview
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const frameUrl = `${API_BASE_URL}/api/segment/video/frame/${result.file_id}?frame_index=0`;
        setImagePreview(frameUrl);
        addToast('Video uploaded successfully', 'success');
      } else {
        // For images, create data URL preview
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
        addToast('Image uploaded successfully', 'success');
      }

    } catch (error) {
      console.error('Upload error:', error);
      addToast('Failed to upload file', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle text segmentation
  const handleSegment = async () => {
    if (!currentFileId || !textPrompt.trim()) {
      addToast('Please upload a file and enter a prompt', 'error');
      return;
    }

    try {
      setIsLoading(true);

      let result;
      if (currentFileType === 'video') {
        // Use video segmentation API
        result = await segmentVideoWithText(
          currentFileId,
          textPrompt,
          0, // frame_index
          confidenceThreshold
        );
        addToast(`Found ${result.masks?.length || 0} instances in video`, 'success');
      } else {
        // Use image segmentation API
        result = await segmentImageWithText(
          currentFileId,
          textPrompt,
          confidenceThreshold
        );
        addToast(`Found ${result.masks?.length || 0} instances`, 'success');
      }

      setSegmentationResult(result);
    } catch (error) {
      console.error('Segmentation error:', error);
      addToast('Segmentation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle point refinement
  const handlePointClick = async (point) => {
    addRefinementPoint(point);

    try {
      setIsLoading(true);

      const points = [...refinementPoints, point];
      const result = await refineWithPoints(currentFileId, points);

      setSegmentationResult(result);
      addToast('Segmentation refined', 'success');
    } catch (error) {
      console.error('Refinement error:', error);
      addToast('Refinement failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle box refinement
  const handleBoxDraw = async (box) => {
    try {
      setIsLoading(true);

      const result = await refineWithBox(currentFileId, box);

      setSegmentationResult(result);
      addToast('Segmentation refined with box', 'success');
    } catch (error) {
      console.error('Box refinement error:', error);
      addToast('Box refinement failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save masks - download as ZIP
  const handleSave = async () => {
    if (!currentFileId || !segmentationResult) {
      addToast('No segmentation results to save', 'error');
      return;
    }

    try {
      setIsLoading(true);
      addToast('Preparing download...', 'info');

      const blob = await downloadMasksAsZip(
        currentFileId,
        segmentationResult.masks,
        segmentationResult.scores,
        segmentationResult.boxes,
        textPrompt,
        segmentationResult.labels || []
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'segmentation_masks.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast('Download started!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      addToast(`Download failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportAnnotations(currentFileId, 'coco', true);
      addToast('Export initiated', 'info');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Export failed', 'error');
    }
  };

  // Handle reset
  const handleReset = () => {
    clearCurrentFile();
    setImagePreview(null);
    setTextPrompt('');
    clearRefinementPoints();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Single Image/Video Segmentation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload an image or video, provide a text prompt, and refine with interactive tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main canvas area */}
        <div className="lg:col-span-2 space-y-4">
          {!imagePreview ? (
            <ImageUploader onFileSelect={handleFileSelect} />
          ) : (
            <>
              {/* Prompt input */}
              <div className="card p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSegment()}
                    placeholder="Enter text prompt (e.g., 'leaf, crack' for multiple)..."
                    className="input flex-1"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSegment}
                    disabled={isLoading || !textPrompt.trim()}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Segment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Canvas */}
              <SegmentationCanvas
                imageUrl={imagePreview}
                masks={segmentationResult?.masks}
                onPointClick={handlePointClick}
                onBoxDraw={handleBoxDraw}
              />

              {/* Reset button */}
              <button
                onClick={handleReset}
                className="btn-secondary w-full"
              >
                Upload New File
              </button>
            </>
          )}
        </div>

        {/* Tool panel */}
        <div>
          <ToolPanel
            onClearPoints={clearRefinementPoints}
            onSave={handleSave}
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  );
};

export default SingleMode;
