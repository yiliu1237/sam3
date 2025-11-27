import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Shape, Line } from 'react-konva';
import useStore from '../store/useStore';

const SegmentationCanvas = ({ imageUrl, masks, onPointClick, onBoxDraw }) => {
  console.log('🔵 SegmentationCanvas render - masks:', masks ? masks.length : 'null');

  const stageRef = useRef(null);
  const [image, setImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [drawingBox, setDrawingBox] = useState(null);
  const [boxStart, setBoxStart] = useState(null);

  const {
    activeTool,
    refinementPoints,
    selectedMaskId,
    setSelectedMaskId,
  } = useStore();

  // Generate unique colors for each instance
  const generateInstanceColor = (index, total) => {
    // Use HSL color space for better color distribution
    const hue = (index * 360 / Math.max(total, 1)) % 360;
    const saturation = 70 + (index % 3) * 10;
    const lightness = 50 + (index % 2) * 10;

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

  // Calculate mask statistics (pixel count and center)
  const calculateMaskStats = (mask) => {
    let sumX = 0, sumY = 0, count = 0;

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (mask[y][x]) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    return {
      pixelCount: count,
      centerX: count > 0 ? sumX / count : 0,
      centerY: count > 0 ? sumY / count : 0,
    };
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

  // Handle mask click for selection
  const handleMaskClick = (maskId) => {
    if (activeTool !== 'cursor') return;
    setSelectedMaskId(maskId);
  };

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

<<<<<<< Updated upstream
  // Render mask overlay with single transparent color
=======
  // Generate distinct colors for each instance
  const getInstanceColor = (idx, total) => {
    // Use HSL color space to generate distinct colors
    const hue = (idx * 360 / Math.max(total, 1)) % 360;
    const saturation = 70 + (idx % 3) * 10; // 70-90%
    const lightness = 50 + (idx % 2) * 10;  // 50-60%

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

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return [r, g, b];
  };

  // Render mask overlay
>>>>>>> Stashed changes
  const renderMasks = () => {
    if (!masks || !image) return null;

    console.log('🎨 Total masks to render:', masks.length);
    console.log('📐 Image dimensions:', image.width, 'x', image.height);
    console.log('📐 Display dimensions:', dimensions.width, 'x', dimensions.height);
    console.log('📐 Mask dimensions:', masks[0]?.[0]?.length || 0, 'x', masks[0]?.length || 0);

<<<<<<< Updated upstream
    const maskElements = [];
    const scaleX = dimensions.width / (masks[0]?.[0]?.length || 1);
    const scaleY = dimensions.height / (masks[0]?.length || 1);

    console.log('🔍 Scale factors - scaleX:', scaleX.toFixed(3), 'scaleY:', scaleY.toFixed(3));
=======
      // Get instance-specific color
      const [r, g, b] = getInstanceColor(idx, masks.length);
      const alpha = selectedMasks.includes(idx) ? 150 : 100; // Higher opacity for selected

      // Create colored overlay
      const imageData = ctx.createImageData(canvas.width, canvas.height);

      for (let y = 0; y < mask.length; y++) {
        for (let x = 0; x < mask[y].length; x++) {
          if (mask[y][x]) {
            const i = (y * mask[y].length + x) * 4;
            imageData.data[i] = r;
            imageData.data[i + 1] = g;
            imageData.data[i + 2] = b;
            imageData.data[i + 3] = alpha;
          }
        }
      }
>>>>>>> Stashed changes

    masks.forEach((mask, idx) => {
      const isSelected = selectedMaskId === idx;

<<<<<<< Updated upstream
      // Generate unique color for this instance
      const baseColor = generateInstanceColor(idx, masks.length);
      // Higher opacity for selected mask (0.7), lower for unselected (0.3)
      const opacity = isSelected ? 0.7 : 0.3;
      const fillColor = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity})`;
=======
      // Draw boundary outline
      ctx.strokeStyle = selectedMasks.includes(idx)
        ? `rgba(255, 255, 255, 0.9)` // White outline for selected
        : `rgba(${r}, ${g}, ${b}, 0.9)`; // Same color but opaque for unselected
      ctx.lineWidth = 2;

      // Find and draw boundaries
      for (let y = 0; y < mask.length; y++) {
        for (let x = 0; x < mask[y].length; x++) {
          if (mask[y][x]) {
            // Check if this pixel is on the boundary
            const isBoundary =
              (x === 0 || !mask[y][x - 1]) ||
              (x === mask[y].length - 1 || !mask[y][x + 1]) ||
              (y === 0 || !mask[y - 1][x]) ||
              (y === mask.length - 1 || !mask[y + 1][x]);

            if (isBoundary) {
              ctx.fillStyle = ctx.strokeStyle;
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }

      const maskImg = new window.Image();
      maskImg.src = canvas.toDataURL();
>>>>>>> Stashed changes

      // Bright border color (increase brightness by 20%)
      const brightColor = baseColor.map(c => Math.min(255, Math.round(c * 1.2)));
      const strokeColor = `rgb(${brightColor[0]}, ${brightColor[1]}, ${brightColor[2]})`;

      // Add transparent fill (clickable)
      maskElements.push(
        <Shape
          key={`mask-${idx}`}
          sceneFunc={(context, shape) => {
            context.beginPath();

            // Draw filled regions
            for (let y = 0; y < mask.length; y++) {
              for (let x = 0; x < mask[y].length; x++) {
                if (mask[y][x]) {
                  context.rect(x * scaleX, y * scaleY, scaleX, scaleY);
                }
              }
            }

            context.fillStrokeShape(shape);
          }}
          fill={fillColor}
          onClick={() => handleMaskClick(idx)}
          onTap={() => handleMaskClick(idx)}
          listening={activeTool === 'cursor'}
        />
      );

      // Add bright border - draw using Shape to stroke the edges
      maskElements.push(
        <Shape
          key={`border-${idx}`}
          sceneFunc={(context, shape) => {
            context.beginPath();

            // Draw only the edge pixels
            for (let y = 0; y < mask.length; y++) {
              for (let x = 0; x < mask[y].length; x++) {
                if (mask[y][x]) {
                  // Check if this pixel is on the boundary
                  const isEdge =
                    x === 0 || x === mask[y].length - 1 || y === 0 || y === mask.length - 1 ||
                    !mask[y-1]?.[x] || !mask[y+1]?.[x] || !mask[y][x-1] || !mask[y][x+1];

                  if (isEdge) {
                    context.rect(x * scaleX, y * scaleY, scaleX, scaleY);
                  }
                }
              }
            }

            context.fillStrokeShape(shape);
          }}
          fill={strokeColor}
          listening={false}
        />
      );

      // Calculate mask statistics (for debugging if needed)
      const stats = calculateMaskStats(mask);
      const { pixelCount } = stats;

      console.log(`  Mask ${idx}: ${pixelCount} pixels (${(pixelCount * scaleX * scaleY).toFixed(1)} display pixels)`);
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
