import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Line } from 'react-konva';
import useStore from '../store/useStore';

const SegmentationCanvas = ({ imageUrl, masks, onPointClick, onBoxDraw }) => {
  const stageRef = useRef(null);
  const [image, setImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [drawingBox, setDrawingBox] = useState(null);
  const [boxStart, setBoxStart] = useState(null);

  const {
    activeTool,
    refinementPoints,
    selectedMasks,
    toggleMaskSelection,
  } = useStore();

  // Load image
  useEffect(() => {
    if (!imageUrl) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);

      // Calculate dimensions to fit container
      const maxWidth = 800;
      const maxHeight = 600;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

      setDimensions({
        width: img.width * ratio,
        height: img.height * ratio,
      });
    };
  }, [imageUrl]);

  // Handle canvas click for points
  const handleStageClick = (e) => {
    if (activeTool !== 'point') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (point && onPointClick) {
      // Convert to image coordinates
      const scaleX = image.width / dimensions.width;
      const scaleY = image.height / dimensions.height;

      onPointClick({
        x: point.x * scaleX,
        y: point.y * scaleY,
        label: 1, // Positive point by default
      });
    }
  };

  // Handle box drawing
  const handleMouseDown = (e) => {
    if (activeTool !== 'box') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setBoxStart(point);
    setDrawingBox({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (activeTool !== 'box' || !boxStart) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setDrawingBox({
      x: Math.min(boxStart.x, point.x),
      y: Math.min(boxStart.y, point.y),
      width: Math.abs(point.x - boxStart.x),
      height: Math.abs(point.y - boxStart.y),
    });
  };

  const handleMouseUp = (e) => {
    if (activeTool !== 'box' || !drawingBox) return;

    // Convert to image coordinates
    const scaleX = image.width / dimensions.width;
    const scaleY = image.height / dimensions.height;

    if (onBoxDraw) {
      onBoxDraw({
        x1: drawingBox.x * scaleX,
        y1: drawingBox.y * scaleY,
        x2: (drawingBox.x + drawingBox.width) * scaleX,
        y2: (drawingBox.y + drawingBox.height) * scaleY,
      });
    }

    setDrawingBox(null);
    setBoxStart(null);
  };

  // Render mask overlay
  const renderMasks = () => {
    if (!masks || !image) return null;

    return masks.map((mask, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = mask[0].length;
      canvas.height = mask.length;
      const ctx = canvas.getContext('2d');

      // Create colored overlay
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const color = selectedMasks.includes(idx)
        ? [14, 165, 233, 120] // Primary blue with transparency
        : [59, 130, 246, 80];   // Lighter blue

      for (let y = 0; y < mask.length; y++) {
        for (let x = 0; x < mask[y].length; x++) {
          if (mask[y][x]) {
            const i = (y * mask[y].length + x) * 4;
            imageData.data[i] = color[0];
            imageData.data[i + 1] = color[1];
            imageData.data[i + 2] = color[2];
            imageData.data[i + 3] = color[3];
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const maskImg = new window.Image();
      maskImg.src = canvas.toDataURL();

      return (
        <KonvaImage
          key={idx}
          image={maskImg}
          width={dimensions.width}
          height={dimensions.height}
          onClick={() => toggleMaskSelection(idx)}
        />
      );
    });
  };

  // Render refinement points
  const renderPoints = () => {
    if (!image) return null;

    const scaleX = dimensions.width / image.width;
    const scaleY = dimensions.height / image.height;

    return refinementPoints.map((point, idx) => (
      <Circle
        key={idx}
        x={point.x * scaleX}
        y={point.y * scaleY}
        radius={5}
        fill={point.label === 1 ? '#22c55e' : '#ef4444'}
        stroke="white"
        strokeWidth={2}
      />
    ));
  };

  return (
    <div className="card p-4">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="rounded-lg overflow-hidden"
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}
          {renderMasks()}
          {renderPoints()}
          {drawingBox && (
            <Rect
              x={drawingBox.x}
              y={drawingBox.y}
              width={drawingBox.width}
              height={drawingBox.height}
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default SegmentationCanvas;
