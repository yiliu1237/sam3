import { create } from 'zustand';

const useStore = create((set, get) => ({
  // UI State
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  // Current mode
  mode: 'single', // 'single' or 'batch'
  setMode: (mode) => set({ mode }),

  // Current file
  currentFile: null,
  currentFileId: null,
  currentFileType: null,
  setCurrentFile: (file, fileId, fileType) => set({
    currentFile: file,
    currentFileId: fileId,
    currentFileType: fileType
  }),
  clearCurrentFile: () => set({
    currentFile: null,
    currentFileId: null,
    currentFileType: null,
    segmentationResult: null,
    refinementPoints: [],
    refinementBoxes: []
  }),

  // Text prompt
  textPrompt: '',
  setTextPrompt: (prompt) => set({ textPrompt: prompt }),

  // Segmentation result
  segmentationResult: null,
  setSegmentationResult: (result) => set({ segmentationResult: result }),

  // Loading state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Refinement tools
  activeTool: 'cursor', // 'cursor', 'point', 'box'
  setActiveTool: (tool) => set({ activeTool: tool }),

  refinementPoints: [],
  addRefinementPoint: (point) => set((state) => ({
    refinementPoints: [...state.refinementPoints, point]
  })),
  clearRefinementPoints: () => set({ refinementPoints: [] }),

  refinementBoxes: [],
  addRefinementBox: (box) => set((state) => ({
    refinementBoxes: [...state.refinementBoxes, box]
  })),
  clearRefinementBoxes: () => set({ refinementBoxes: [] }),

  // Selected mask (single selection)
  selectedMaskId: null,
  setSelectedMaskId: (maskId) => set({ selectedMaskId: maskId }),
  clearMaskSelection: () => set({ selectedMaskId: null }),

  // Batch processing
  batchJobs: {},
  addBatchJob: (jobId, jobInfo) => set((state) => ({
    batchJobs: { ...state.batchJobs, [jobId]: jobInfo }
  })),
  updateBatchJob: (jobId, updates) => set((state) => ({
    batchJobs: {
      ...state.batchJobs,
      [jobId]: { ...state.batchJobs[jobId], ...updates }
    }
  })),

  // Confidence threshold
  confidenceThreshold: 0.5,
  setConfidenceThreshold: (threshold) => set({ confidenceThreshold: threshold }),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
}));

export default useStore;
