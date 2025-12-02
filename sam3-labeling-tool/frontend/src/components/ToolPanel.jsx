import React from 'react';
import { MousePointer, CircleDot, Square, Trash2, Download, Save, Paintbrush, Eraser, Undo2, Redo2 } from 'lucide-react';
import useStore from '../store/useStore';

const ToolPanel = ({ onSave }) => {  // onClearPoints removed
  const {
    activeTool,
    setActiveTool,
    confidenceThreshold,
    setConfidenceThreshold,
    // refinementPoints,  // Disabled - Point tool removed
    segmentationResult,
    selectedMaskId,
    brushSize,
    setBrushSize,
    addToast,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useStore();

  const tools = [
    { id: 'cursor', icon: MousePointer, label: 'Cursor' },
    // NOTE: Point and Box tools are disabled because SAM3's architecture doesn't support
    // true instance-aware refinement with these prompts. Using add_geometric_prompt()
    // reruns the entire detection pipeline (unpredictable), and using predict_inst()
    // creates new masks instead of refining existing ones. Use Brush/Eraser for refinement.
    // { id: 'point', icon: CircleDot, label: 'Point' },
    // { id: 'box', icon: Square, label: 'Box' },
    { id: 'brush', icon: Paintbrush, label: 'Brush' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const handleToolSelect = (toolId) => {
    // Validate brush/eraser tool selection
    if ((toolId === 'brush' || toolId === 'eraser') && !segmentationResult) {
      addToast('Please run segmentation first before using brush/eraser tools', 'warning');
      return;
    }
    if (toolId === 'eraser' && (selectedMaskId === null || selectedMaskId === 'new')) {
      addToast('Please select a mask to erase from', 'warning');
      return;
    }
    setActiveTool(toolId);
  };

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tools
        </h3>

        {/* Tool buttons */}
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isDisabled = (tool.id === 'brush' || tool.id === 'eraser') && !segmentationResult;

            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                disabled={isDisabled}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                  activeTool === tool.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : isDisabled
                      ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1 font-medium">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confidence threshold */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Confidence Threshold: {confidenceThreshold.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
      </div>

      {/* Brush size (only show when brush/eraser is active) */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Brush Size: {brushSize}px
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>5px</span>
            <span>100px</span>
          </div>
        </div>
      )}

      {/* Undo/Redo */}
      {segmentationResult && (
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
            <span>Undo</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
            <span>Redo</span>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {/* Clear Points button removed - Point tool disabled */}

        {segmentationResult && (
          <button
            onClick={onSave}
            className="w-full flex items-center justify-center space-x-2 btn-primary"
          >
            <Download size={18} />
            <span>Download Results</span>
          </button>
        )}
      </div>

      {/* Stats */}
      {segmentationResult && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Detection Stats
          </h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Instances:</span>
              <span className="font-medium">{segmentationResult.masks?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Score:</span>
              <span className="font-medium">
                {segmentationResult.scores?.length
                  ? (
                      segmentationResult.scores.reduce((a, b) => a + b, 0) /
                      segmentationResult.scores.length
                    ).toFixed(2)
                  : 'N/A'}
              </span>
            </div>
            {selectedMaskId !== null && (
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Selected Mask ID:</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {selectedMaskId}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolPanel;
