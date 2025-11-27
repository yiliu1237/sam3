import React, { useState } from 'react';
import { X, FolderOpen } from 'lucide-react';

const SaveDialog = ({ isOpen, onClose, onSave }) => {
  const [basePath, setBasePath] = useState('');
  const [subfolder, setSubfolder] = useState('');
  const [directoryHandle, setDirectoryHandle] = useState(null);
  // Disable native picker for now - it can't provide full paths due to browser security
  const [useNativePicker, setUseNativePicker] = useState(false);

  if (!isOpen) return null;

  // Handle folder picker click - use native picker
  const handleBrowseFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        setDirectoryHandle(handle);
        setBasePath(handle.name);
      } else {
        alert('Native folder picker not supported in this browser.\nPlease use Chrome, Edge, or another Chromium-based browser.\n\nOr manually enter the folder path.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error picking folder:', error);
      }
    }
  };

  const handleSave = () => {
    if (useNativePicker) {
      // Use native folder picker - pass directory handle
      if (!directoryHandle) {
        alert('Please select a folder using the folder picker');
        return;
      }
      onSave({ directoryHandle, subfolder: subfolder.trim(), useNativePicker: true });
    } else {
      // Manual path entry fallback
      if (!basePath.trim()) {
        alert('Please enter a base folder path');
        return;
      }

      // Combine base path and subfolder
      let finalPath = basePath.trim();
      if (subfolder.trim()) {
        const separator = finalPath.includes('\\') ? '\\' : '/';
        finalPath = `${finalPath}${separator}${subfolder.trim()}`;
      }
      onSave({ path: finalPath, useNativePicker: false });
    }
    handleClose();
  };

  const handleClose = () => {
    setBasePath('');
    setSubfolder('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Save Masks
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Base Folder Selection */}
        <div className="space-y-4">
          {useNativePicker ? (
            /* Native Folder Picker */
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Folder *
              </label>
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <FolderOpen size={24} className="text-primary-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {directoryHandle ? `Selected: ${basePath}` : 'Click to Choose Folder'}
                </span>
              </button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {directoryHandle ? 'Folder selected! You can choose another or add a subfolder below.' : 'Click above to open your system\'s folder picker'}
              </p>
            </div>
          ) : (
            /* Manual Path Entry */
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Folder Path *
              </label>
              <input
                type="text"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                placeholder="Enter full folder path"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              />
            </div>
          )}

          {/* Subfolder Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subfolder Name (optional)
            </label>
            <input
              type="text"
              value={subfolder}
              onChange={(e) => setSubfolder(e.target.value)}
              placeholder="e.g., segmentation_results"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave blank to save directly in base folder
            </p>
          </div>

          {/* Preview */}
          {(directoryHandle || basePath) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Save location:
              </p>
              <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {useNativePicker
                  ? `${basePath}${subfolder ? '/' + subfolder : ''}`
                  : `${basePath}${subfolder ? (basePath.includes('\\') ? '\\' : '/') + subfolder : ''}`
                }
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 btn-primary"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDialog;
