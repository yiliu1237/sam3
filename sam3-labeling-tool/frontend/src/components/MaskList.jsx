import React from 'react';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import useStore from '../store/useStore';

const MaskList = ({ masks = [], scores = [], onDeleteMask }) => {
  const {
    selectedMaskId,
    setSelectedMaskId,
    activeTool,
    addToast,
  } = useStore();

  const handleMaskSelect = (maskId) => {
    setSelectedMaskId(maskId);
  };

  const handleCreateNewMask = () => {
    if (activeTool !== 'brush') {
      addToast('Please select the Brush tool first', 'warning');
      return;
    }
    setSelectedMaskId('new');
    addToast('Ready to create new mask - start painting!', 'info');
  };

  const handleDeleteMask = (maskId, e) => {
    e.stopPropagation();

    if (!onDeleteMask) {
      addToast('Delete mask function not available', 'error');
      return;
    }

    // Confirm deletion
    if (window.confirm(`Are you sure you want to delete Mask #${maskId + 1}?`)) {
      onDeleteMask(maskId);
      addToast(`Mask #${maskId + 1} deleted`, 'success');

      // Clear selection if we deleted the selected mask
      if (selectedMaskId === maskId) {
        setSelectedMaskId(null);
      } else if (selectedMaskId > maskId) {
        // Adjust selection index if we deleted a mask before the selected one
        setSelectedMaskId(selectedMaskId - 1);
      }
    }
  };

  // Generate color for mask instance (same logic as SegmentationCanvas)
  const generateInstanceColor = (index, total) => {
    const hue = (index * 360 / Math.max(total, 1)) % 360;
    const saturation = 70 + (index % 3) * 10;
    const lightness = 50 + (index % 2) * 10;

    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  };

  if (!masks || masks.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Mask Instances
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No masks detected yet
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Mask Instances ({masks.length})
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {masks.map((mask, idx) => {
          const isSelected = selectedMaskId === idx;
          const color = generateInstanceColor(idx, masks.length);
          const score = scores[idx] || 0;

          return (
            <div
              key={idx}
              onClick={() => handleMaskSelect(idx)}
              className={`
                flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                ${isSelected
                  ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500'
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {/* Radio button */}
              <div className="flex-shrink-0">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${isSelected
                    ? 'border-primary-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  )}
                </div>
              </div>

              {/* Color swatch */}
              <div
                className="w-6 h-6 rounded border-2 border-white dark:border-gray-600 shadow-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Mask info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Mask #{idx + 1}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {score.toFixed(2)}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteMask(idx, e)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete mask"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Create new mask button */}
      <button
        onClick={handleCreateNewMask}
        className={`
          w-full mt-3 px-3 py-2 rounded-lg border-2 border-dashed
          transition-all text-sm font-medium
          ${selectedMaskId === 'new'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600'
          }
        `}
      >
        + Create New Mask
      </button>

      {/* Helper text */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {activeTool === 'brush'
              ? selectedMaskId === 'new'
                ? 'Paint to create a new mask'
                : selectedMaskId !== null
                  ? `Paint to add to Mask #${selectedMaskId + 1}`
                  : 'Select a mask or create new'
              : selectedMaskId !== null && selectedMaskId !== 'new'
                ? `Paint to erase from Mask #${selectedMaskId + 1}`
                : 'Select a mask to erase from'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MaskList;
