import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import SegmentationCanvas from '../components/SegmentationCanvas';
import ToolPanel from '../components/ToolPanel';
import useStore from '../store/useStore';
import {
  uploadFile,
  segmentImageWithText,
  refineWithPoints,
  refineWithBox,
  exportAnnotations,
} from '../api/client';

const SingleMode = () => {
  const [imagePreview, setImagePreview] = useState(null);

  const {
    currentFileId,
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

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);

      // Upload file
      const result = await uploadFile(file);
      setCurrentFile(file, result.file_id, result.file_type);

      addToast('File uploaded successfully', 'success');
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
      addToast('Please upload an image and enter a prompt', 'error');
      return;
    }

    try {
      setIsLoading(true);

      const result = await segmentImageWithText(
        currentFileId,
        textPrompt,
        confidenceThreshold
      );

      setSegmentationResult(result);
      addToast(`Found ${result.masks.length} instances`, 'success');
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSegment()}
                    placeholder="Enter text prompt (e.g., 'crack', 'person', 'car')..."
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
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  );
};

export default SingleMode;
