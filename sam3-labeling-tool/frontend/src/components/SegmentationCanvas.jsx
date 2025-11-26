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

  // Generate unique colors for each instance
  const generateInstanceColor = (index, total) => {
    // Use HSL color space for better color distribution
    const hue = (index * 360 / Math.max(total, 1)) % 360;
    const saturation = 70 + (index % 3) * 10; // Vary saturation slightly
    const lightness = 50 + (index % 2) * 10; // Vary lightness slightly

    // Convert HSL to RGB
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

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  // Extract boundary from mask
  const extractBoundary = (mask) => {
    const boundaries = [];
    const height = mask.length;
    const width = mask[0].length;

    // Find edge pixels using 4-connectivity
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x]) {
          // Check if this pixel is on the boundary
          const isEdge =
            x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
            !mask[y-1]?.[x] || !mask[y+1]?.[x] || !mask[y][x-1] || !mask[y][x+1];

          if (isEdge) {
            boundaries.push({ x, y });
          }
        }
      }
    }

    return boundaries;
  };

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

    const maskElements = [];

    masks.forEach((mask, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = mask[0].length;
      canvas.height = mask.length;
      const ctx = canvas.getContext('2d');

      // Generate unique color for this instance
      const baseColor = generateInstanceColor(idx, masks.length);

      // Make masks very transparent - adjust opacity based on selection
      const opacity = selectedMasks.includes(idx) ? 60 : 40;
      const color = [...baseColor, opacity];

      // Create colored overlay
      const imageData = ctx.createImageData(canvas.width, canvas.height);

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

      // Add the mask overlay
      maskElements.push(
        <KonvaImage
          key={`mask-${idx}`}
          image={maskImg}
          width={dimensions.width}
          height={dimensions.height}
          onClick={() => toggleMaskSelection(idx)}
        />
      );

      // Add boundary visualization
      const boundaries = extractBoundary(mask);
      if (boundaries.length > 0) {
        const scaleX = dimensions.width / mask[0].length;
        const scaleY = dimensions.height / mask.length;

        // Draw boundary points as a continuous line
        const boundaryPoints = boundaries.flatMap(b => [
          b.x * scaleX,
          b.y * scaleY
        ]);

        // Use bright, fully opaque colors for boundaries
        const brightColor = baseColor.map(c => Math.min(255, Math.round(c * 1.2)));

        maskElements.push(
          <Line
            key={`boundary-${idx}`}
            points={boundaryPoints}
            stroke={`rgb(${brightColor[0]}, ${brightColor[1]}, ${brightColor[2]})`}
            strokeWidth={3}
            opacity={1.0}
            lineCap="round"
            lineJoin="round"
          />
        );
      }
    });

    return maskElements;
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
