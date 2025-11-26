import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Film } from 'lucide-react';
import { motion } from 'framer-motion';

const ImageUploader = ({ onFileSelect, accept = 'image/*,video/*' }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp'],
      'video/*': ['.mp4', '.avi', '.mov']
    },
    multiple: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-full">
            {isDragActive ? (
              <Upload className="text-primary-600 dark:text-primary-400" size={40} />
            ) : (
              <div className="flex space-x-2">
                <ImageIcon className="text-primary-600 dark:text-primary-400" size={40} />
                <Film className="text-primary-600 dark:text-primary-400" size={40} />
              </div>
            )}
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supports images (JPG, PNG) and videos (MP4, AVI, MOV)
            </p>
          </div>

          <button className="btn-primary">
            Browse Files
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ImageUploader;
