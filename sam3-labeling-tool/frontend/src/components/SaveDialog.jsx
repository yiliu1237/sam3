import React, { useState } from 'react';
import { X, FolderOpen } from 'lucide-react';

const SaveDialog = ({ isOpen, onClose, onSave }) => {
  const [basePath, setBasePath] = useState('');
  const [subfolder, setSubfolder] = useState('');
  const [directoryHandle, setDirectoryHandle] = useState(null);

  if (!isOpen) return null;

  // Handle folder picker click - show instructions
  const handleBrowseFolder = () => {
    const instructions = `How to find your folder path:

macOS:
1. Open Finder
2. Navigate to your desired folder
3. Right-click the folder → "Get Info"
4. Copy the path shown after "Where:"

Windows:
1. Open File Explorer
2. Navigate to your desired folder
3. Click the address bar at the top
4. Copy the full path (e.g., C:\\Users\\username\\Desktop)

Linux:
1. Open your file manager
2. Navigate to your desired folder
3. Right-click → Properties
4. Copy the "Location" or "Path"`;

    alert(instructions);
  };

  const handleSave = () => {
    if (!basePath.trim()) {
      alert('Please enter a base folder path');
      return;
    }

    // Combine base path and subfolder
    let finalPath = basePath.trim();
    if (subfolder.trim()) {
      // Add subfolder to path
      const separator = finalPath.includes('\\') ? '\\' : '/';
      finalPath = `${finalPath}${separator}${subfolder.trim()}`;
    }

    onSave(finalPath);
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

        {/* Base Folder Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base Folder Path *
            </label>
            <div className="relative">
              <input
                type="text"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                placeholder="/Users/username/Desktop or C:\Users\username\Desktop"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="absolute right-2 top-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                title="How to find folder path"
              >
                <FolderOpen
                  className="text-gray-400 hover:text-primary-500"
                  size={20}
                />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Click the folder icon for help finding the path
            </p>
          </div>

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
          {basePath && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Save location:
              </p>
              <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {basePath}{subfolder ? (basePath.includes('\\') ? '\\' : '/') + subfolder : ''}
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
