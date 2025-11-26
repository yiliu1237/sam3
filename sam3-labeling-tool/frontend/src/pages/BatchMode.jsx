import React, { useState, useEffect } from 'react';
import { FolderOpen, Play, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { createBatchJob, getBatchJobStatus } from '../api/client';

const BatchMode = () => {
  const [inputFolder, setInputFolder] = useState('');
  const [outputFolder, setOutputFolder] = useState('');
  const [prompts, setPrompts] = useState(['']);
  const [exportFormat, setExportFormat] = useState('coco');
  const [processVideos, setProcessVideos] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

  const { confidenceThreshold, isLoading, setIsLoading, addToast } = useStore();

  // Poll job status
  useEffect(() => {
    if (!currentJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getBatchJobStatus(currentJobId);
        setJobStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setIsLoading(false);

          if (status.status === 'completed') {
            addToast('Batch processing completed!', 'success');
          } else {
            addToast(`Batch processing failed: ${status.error}`, 'error');
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJobId, setIsLoading, addToast]);

  // Handle prompt changes
  const handlePromptChange = (index, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const addPrompt = () => {
    setPrompts([...prompts, '']);
  };

  const removePrompt = (index) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  // Start batch processing
  const handleStartBatch = async () => {
    if (!inputFolder || !outputFolder) {
      addToast('Please provide input and output folders', 'error');
      return;
    }

    const validPrompts = prompts.filter((p) => p.trim());
    if (validPrompts.length === 0) {
      addToast('Please provide at least one prompt', 'error');
      return;
    }

    try {
      setIsLoading(true);

      const result = await createBatchJob(inputFolder, outputFolder, validPrompts, {
        confidenceThreshold,
        exportFormat,
        processVideos,
      });

      setCurrentJobId(result.job_id);
      addToast('Batch processing started', 'info');
    } catch (error) {
      console.error('Batch error:', error);
      addToast('Failed to start batch processing', 'error');
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!jobStatus) return null;

    switch (jobStatus.status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'failed':
        return <XCircle className="text-red-500" size={24} />;
      case 'processing':
        return <Loader2 className="text-blue-500 animate-spin" size={24} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Batch Processing
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Process multiple images/videos from a folder with automated segmentation
        </p>
      </div>

      <div className="space-y-6">
        {/* Configuration */}
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configuration
          </h3>

          {/* Folders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Input Folder
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputFolder}
                  onChange={(e) => setInputFolder(e.target.value)}
                  placeholder="/path/to/input"
                  className="input flex-1"
                />
                <button className="btn-secondary">
                  <FolderOpen size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Output Folder
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={outputFolder}
                  onChange={(e) => setOutputFolder(e.target.value)}
                  placeholder="/path/to/output"
                  className="input flex-1"
                />
                <button className="btn-secondary">
                  <FolderOpen size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Text Prompts
            </label>
            <div className="space-y-2">
              {prompts.map((prompt, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => handlePromptChange(index, e.target.value)}
                    placeholder={`Prompt ${index + 1} (e.g., 'crack', 'defect')`}
                    className="input flex-1"
                  />
                  {prompts.length > 1 && (
                    <button
                      onClick={() => removePrompt(index)}
                      className="btn-secondary px-3"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addPrompt} className="btn-secondary text-sm">
                + Add Prompt
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="input"
              >
                <option value="coco">COCO JSON</option>
                <option value="mask_png">Mask PNG</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Confidence Threshold
              </label>
              <input
                type="number"
                value={confidenceThreshold}
                onChange={(e) => useStore.setState({ confidenceThreshold: parseFloat(e.target.value) })}
                min="0"
                max="1"
                step="0.1"
                className="input"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={processVideos}
                  onChange={(e) => setProcessVideos(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Process Videos
                </span>
              </label>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartBatch}
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Start Batch Processing</span>
              </>
            )}
          </button>
        </div>

        {/* Progress */}
        {jobStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Processing Status
              </h3>
              {getStatusIcon()}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>
                  {jobStatus.processed_files} / {jobStatus.total_files} files
                </span>
                <span>{(jobStatus.progress * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${jobStatus.progress * 100}%` }}
                />
              </div>
            </div>

            {/* Current file */}
            {jobStatus.current_file && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Currently processing: <span className="font-medium">{jobStatus.current_file}</span>
              </p>
            )}

            {/* Error */}
            {jobStatus.error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Error: {jobStatus.error}
              </p>
            )}

            {/* Download button */}
            {jobStatus.status === 'completed' && (
              <button className="btn-primary w-full mt-4 flex items-center justify-center space-x-2">
                <Download size={18} />
                <span>Download Results</span>
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BatchMode;
