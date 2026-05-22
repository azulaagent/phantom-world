// Procedural SVG Entity Visualization
import { useMemo } from 'react';
import { EVOLUTION_STAGES } from './engine';

export default function EntitySVG({ entity, size = 200 }) {
  const stage = EVOLUTION_STAGES[entity.evolutionStage] || EVOLUTION_STAGES[0];
  const baseSize = stage.size;
  const complexity = stage.complexity;
  const color = entity.traitColor;
  const alive = entity.alive;

  const paths = useMemo(() => {
    if (!alive) return generateDeadForm(size, color);
    return generateLivingForm(size, baseSize, complexity, color, entity.mood, entity.evolutionStage);
  }, [alive, size, baseSize, complexity, color, entity.mood, entity.evolutionStage]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="animate-breathe">
      <defs>
        <radialGradient id="entityGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>
      
      {/* Background glow */}
      <circle cx={size/2} cy={size/2} r={baseSize * 0.8} fill="url(#entityGlow)" className="animate-pulse-glow" />
      
      {/* Core shape */}
      {paths}
      
      {/* Center eye/core */}
      <circle 
        cx={size/2} 
        cy={size/2} 
        r={baseSize * 0.12} 
        fill={alive ? '#fff' : '#333'}
        opacity={alive ? 0.9 : 0.3}
      >
        {alive && (
          <animate attributeName="r" values={`${baseSize*0.1};${baseSize*0.14};${baseSize*0.1}`} dur="3s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}

function generateLivingForm(size, baseSize, complexity, color, mood, stageIndex) {
  const cx = size / 2;
  const cy = size / 2;
  const elements = [];
  
  // Outer tendrils/particles based on complexity
  for (let i = 0; i < complexity * 3; i++) {
    const angle = (i / (complexity * 3)) * Math.PI * 2;
    const dist = baseSize * (0.5 + Math.random() * 0.3);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = 2 + Math.random() * 4;
    
    elements.push(
      <circle key={`tendril-${i}`} cx={x} cy={y} r={r} fill={color} opacity={0.3 + Math.random() * 0.3}>
        <animate 
          attributeName="opacity" 
          values={`${0.2};${0.6};${0.2}`} 
          dur={`${2 + Math.random() * 3}s`} 
          repeatCount="indefinite" 
        />
      </circle>
    );
  }

  // Main body - organic blob shape
  const points = [];
  const numPoints = 6 + complexity * 2;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusVar = baseSize * (0.3 + Math.random() * 0.15);
    const moodMod = mood === 'happy' ? 1.1 : mood === 'sad' ? 0.85 : 1;
    points.push({
      x: cx + Math.cos(angle) * radiusVar * moodMod,
      y: cy + Math.sin(angle) * radiusVar * moodMod,
    });
  }

  // Create smooth path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const cpx = (points[i].x + next.x) / 2;
    const cpy = (points[i].y + next.y) / 2;
    pathD += ` Q ${points[i].x} ${points[i].y} ${cpx} ${cpy}`;
  }
  pathD += ' Z';

  elements.push(
    <path 
      key="body" 
      d={pathD} 
      fill={color} 
      opacity={0.7}
      filter="url(#blur)"
    >
      <animate 
        attributeName="d" 
        values={pathD + ';' + generateAlternatePath(cx, cy, baseSize, numPoints) + ';' + pathD}
        dur="8s" 
        repeatCount="indefinite" 
      />
    </path>
  );

  // Inner rings based on stage
  for (let i = 0; i <= stageIndex; i++) {
    const ringR = baseSize * (0.15 + i * 0.08);
    elements.push(
      <circle 
        key={`ring-${i}`} 
        cx={cx} 
        cy={cy} 
        r={ringR} 
        fill="none" 
        stroke={color} 
        strokeWidth={1} 
        opacity={0.4}
      >
        <animate 
          attributeName="r" 
          values={`${ringR};${ringR + 3};${ringR}`} 
          dur={`${4 + i}s`} 
          repeatCount="indefinite" 
        />
      </circle>
    );
  }

  return elements;
}

function generateAlternatePath(cx, cy, baseSize, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusVar = baseSize * (0.28 + Math.random() * 0.18);
    points.push({
      x: cx + Math.cos(angle) * radiusVar,
      y: cy + Math.sin(angle) * radiusVar,
    });
  }
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const cpx = (points[i].x + next.x) / 2;
    const cpy = (points[i].y + next.y) / 2;
    pathD += ` Q ${points[i].x} ${points[i].y} ${cpx} ${cpy}`;
  }
  return pathD + ' Z';
}

function generateDeadForm(size, color) {
  const cx = size / 2;
  const cy = size / 2;
  return (
    <>
      {/* Broken fragments */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = 20 + Math.random() * 30;
        const x = cx + Math.cos(rad) * dist;
        const y = cy + Math.sin(rad) * dist;
        return (
          <rect 
            key={`frag-${i}`} 
            x={x - 3} 
            y={y - 3} 
            width={6} 
            height={6} 
            fill={color} 
            opacity={0.2}
            transform={`rotate(${angle} ${x} ${y})`}
          />
        );
      })}
      {/* Dead core */}
      <circle cx={cx} cy={cy} r={8} fill="#222" stroke="#333" strokeWidth={1} />
      <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke="#444" strokeWidth={1} />
      <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} stroke="#444" strokeWidth={1} />
    </>
  );
}
