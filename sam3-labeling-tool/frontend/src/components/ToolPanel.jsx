import React from 'react';
import { MousePointer, CircleDot, Square, Trash2, Download } from 'lucide-react';
import useStore from '../store/useStore';

const ToolPanel = ({ onClearPoints, onExport }) => {
  const {
    activeTool,
    setActiveTool,
    confidenceThreshold,
    setConfidenceThreshold,
    refinementPoints,
    segmentationResult,
  } = useStore();

  const tools = [
    { id: 'cursor', icon: MousePointer, label: 'Cursor' },
    { id: 'point', icon: CircleDot, label: 'Point' },
    { id: 'box', icon: Square, label: 'Box' },
  ];

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
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                  activeTool === tool.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
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

      {/* Actions */}
      <div className="space-y-2">
        {refinementPoints.length > 0 && (
          <button
            onClick={onClearPoints}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
            <span>Clear Points ({refinementPoints.length})</span>
          </button>
        )}

        {segmentationResult && (
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center space-x-2 btn-primary"
          >
            <Download size={18} />
            <span>Export Results</span>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolPanel;
