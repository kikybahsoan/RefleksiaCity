import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Building, User } from '../types';
import { AvatarView } from './AvatarView';
import { sounds } from '../utils/audio';

interface IsometricMapProps {
  buildings: Building[];
  currentUser: User;
  onlineUsers: User[];
  selectedBuilding?: Building | null;
  onSelectBuilding: (building: Building) => void;
  isDarkMode: boolean;
  onPlayerMove?: (newPos: { x: number; y: number }) => void;
  playerSpeechText?: string;
}

// Isometric Projection Constants
const TILE_WIDTH = 96;
const TILE_HEIGHT = 48;
const GRID_SIZE = 12;

interface LocalNpcState extends User {
  walkPhase?: number;
}

export const IsometricMap: React.FC<IsometricMapProps> = ({
  buildings,
  currentUser,
  onlineUsers,
  selectedBuilding,
  onSelectBuilding,
  isDarkMode,
  onPlayerMove,
  playerSpeechText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Player position state for fluid continuous humanoid walking
  const [playerPos, setPlayerPos] = useState({ x: currentUser.position.x, y: currentUser.position.y });
  const [isWalking, setIsWalking] = useState(false);
  const [walkPhase, setWalkPhase] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Seating / Tempat Duduk state
  const [isSitting, setIsSitting] = useState(false);
  const [sittingBenchId, setSittingBenchId] = useState<string | null>(null);

  // Local state for autonomous wandering NPCs
  const [npcs, setNpcs] = useState<LocalNpcState[]>([]);

  // Classmate ambient speech bubbles
  const [npcSpeeches, setNpcSpeeches] = useState<{ [id: string]: string }>({
    SISWA02: 'Hai',
    SISWA03: 'iya',
    GURU01: 'Semangat belajar ya!',
  });

  // Sync NPCs from onlineUsers initially
  useEffect(() => {
    const list = onlineUsers
      .filter(u => u.id !== currentUser.id)
      .map(u => ({
        ...u,
        isWalking: false,
        walkPhase: 0,
        facingLeft: false,
      }));
    setNpcs(list);
  }, [onlineUsers, currentUser.id]);

  // Center camera on player initially
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pIso = toIso(playerPos.x, playerPos.y);
      setPan({
        x: rect.width / 2 - pIso.x * scale,
        y: rect.height / 2 - pIso.y * scale - 40,
      });
    }
  }, []);

  useEffect(() => {
    setPlayerPos({ x: currentUser.position.x, y: currentUser.position.y });
  }, [currentUser.position.x, currentUser.position.y]);

  const toIso = (gx: number, gy: number) => {
    const x = (gx - gy) * (TILE_WIDTH / 2);
    const y = (gx + gy) * (TILE_HEIGHT / 2);
    return { x, y };
  };

  // Tree coordinates across the map
  const TREE_COORDS = [
    [1, 1], [3, 1], [8, 1], [10, 2],
    [1, 5], [10, 5], [1, 9], [3, 10], [6, 10], [8, 10], [10, 9],
    [4, 4], [6, 4], [4, 6], [6, 6]
  ];

  const hasTreeTile = useCallback((gx: number, gy: number) => {
    return TREE_COORDS.some(([x, y]) => x === gx && y === gy);
  }, []);

  // Building footprint solid obstacle tiles (avatar and NPCs cannot penetrate these)
  const BUILDING_OBSTACLES = [
    // Perpustakaan at (2,3)
    [2, 3], [2, 2], [1, 3], [1, 2],
    // Dewan Kota at (6,2)
    [6, 2], [7, 2], [6, 1], [7, 1],
    // Menara Siaran at (8,4)
    [8, 4], [8, 3], [9, 4], [9, 3],
    // Polisi at (2,7)
    [2, 7], [2, 6], [1, 7], [1, 6],
    // Kafe at (7,7)
    [7, 7], [8, 7],
    // Toko Poin at (4,8)
    [4, 8], [3, 8], [4, 9], [3, 9],
    // Bandara at (9,8)
    [9, 8], [10, 8], [9, 9], [10, 9],
    // Alun-alun center fountain
    [5, 5]
  ];

  // Seating / Benches ("Tempat Duduk")
  const BENCHES = [
    { id: 'bench_alun', name: 'Bangku Taman Air Mancur', gx: 4, gy: 5, type: 'stone' as const, label: 'Duduk di Taman Air Mancur 🍃' },
    { id: 'bench_kafe', name: 'Teras Kafe Kopi', gx: 7, gy: 6, type: 'cafe' as const, label: 'Duduk Santai di Teras Kafe ☕' },
    { id: 'bench_perpus', name: 'Bangku Baca Perpustakaan', gx: 3, gy: 4, type: 'park' as const, label: 'Duduk Membaca Buku 📖' },
    { id: 'bench_selatan', name: 'Bangku Teduh Selatan', gx: 5, gy: 7, type: 'park' as const, label: 'Duduk Istirahat Sejenak 🌸' },
  ];

  const isObstacleTile = useCallback((gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return true;
    if (hasTreeTile(gx, gy)) return true;
    return BUILDING_OBSTACLES.some(([bx, by]) => bx === gx && by === gy);
  }, [hasTreeTile]);

  const isWalkableTile = useCallback((gx: number, gy: number) => {
    return !isObstacleTile(gx, gy);
  }, [isObstacleTile]);

  // Breadth-First Search (BFS) pathfinder on grid ensuring avatar never passes through trees or buildings
  const findPath = useCallback((startGx: number, startGy: number, targetGx: number, targetGy: number): { x: number; y: number }[] => {
    let destGx = targetGx;
    let destGy = targetGy;

    // If destination is an obstacle, redirect to nearest open walkable neighbor
    if (isObstacleTile(destGx, destGy)) {
      const candidates = [
        { x: destGx + 1, y: destGy },
        { x: destGx - 1, y: destGy },
        { x: destGx, y: destGy + 1 },
        { x: destGx, y: destGy - 1 },
        { x: destGx + 1, y: destGy + 1 },
        { x: destGx - 1, y: destGy - 1 },
        { x: destGx + 1, y: destGy - 1 },
        { x: destGx - 1, y: destGy + 1 },
      ].filter(c => !isObstacleTile(c.x, c.y));

      if (candidates.length > 0) {
        candidates.sort((a, b) => Math.hypot(a.x - startGx, a.y - startGy) - Math.hypot(b.x - startGx, b.y - startGy));
        destGx = candidates[0].x;
        destGy = candidates[0].y;
      } else {
        return [{ x: startGx, y: startGy }];
      }
    }

    if (startGx === destGx && startGy === destGy) {
      return [{ x: destGx, y: destGy }];
    }

    const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
      { x: startGx, y: startGy, path: [{ x: startGx, y: startGy }] }
    ];
    const visited = new Set<string>();
    visited.add(`${startGx},${startGy}`);

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === destGx && current.y === destGy) {
        return current.path;
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (!visited.has(key) && !isObstacleTile(nx, ny)) {
          visited.add(key);
          queue.push({
            x: nx,
            y: ny,
            path: [...current.path, { x: nx, y: ny }]
          });
        }
      }
    }

    return [{ x: destGx, y: destGy }];
  }, [isObstacleTile]);

  // Autonomous NPC random wandering simulation with smooth humanoid steps
  useEffect(() => {
    if (npcs.length === 0) return;

    const wanderInterval = setInterval(() => {
      const availableIndices = npcs
        .map((npc, idx) => (!npc.isWalking ? idx : -1))
        .filter(idx => idx !== -1);

      if (availableIndices.length === 0) return;

      const targetIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const npc = npcs[targetIdx];
      if (!npc) return;

      const possibleDeltas = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 1 },
        { dx: -1, dy: -1 },
      ];

      const validTargets = possibleDeltas
        .map(d => ({ x: npc.position.x + d.dx, y: npc.position.y + d.dy }))
        .filter(pos => isWalkableTile(pos.x, pos.y));

      if (validTargets.length === 0) return;

      const chosen = validTargets[Math.floor(Math.random() * validTargets.length)];
      const startX = npc.position.x;
      const startY = npc.position.y;
      const targetX = chosen.x;
      const targetY = chosen.y;
      const facingLeft = targetX < startX || (targetX === startX && targetY > startY);

      const duration = 1600;
      const startTime = performance.now();

      setNpcs(prev => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx] = {
            ...copy[targetIdx],
            isWalking: true,
            facingLeft,
          };
        }
        return copy;
      });

      const animateNpcWalk = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        const curX = startX + (targetX - startX) * ease;
        const curY = startY + (targetY - startY) * ease;
        const phase = (elapsed / 220) * Math.PI * 2;

        if (progress < 1) {
          setNpcs(prev => {
            const copy = [...prev];
            if (copy[targetIdx]) {
              copy[targetIdx] = {
                ...copy[targetIdx],
                position: { x: curX, y: curY },
                walkPhase: phase,
              };
            }
            return copy;
          });
          requestAnimationFrame(animateNpcWalk);
        } else {
          setNpcs(prev => {
            const copy = [...prev];
            if (copy[targetIdx]) {
              copy[targetIdx] = {
                ...copy[targetIdx],
                position: { x: targetX, y: targetY },
                isWalking: false,
                walkPhase: 0,
              };
            }
            return copy;
          });
        }
      };

      requestAnimationFrame(animateNpcWalk);
    }, 4500);

    return () => clearInterval(wanderInterval);
  }, [npcs, isWalkableTile]);

  // Ambient speech bubbles cycle
  useEffect(() => {
    const speechPool = ['Hai', 'iya', '...', 'Mantap!', 'Lagi refleksi', 'Ketemu di kafe', 'Adem banget', 'Semangat!'];
    const interval = setInterval(() => {
      if (npcs.length === 0) return;
      const randomNpc = npcs[Math.floor(Math.random() * npcs.length)];
      if (randomNpc) {
        const randomSpeech = speechPool[Math.floor(Math.random() * speechPool.length)];
        setNpcSpeeches(prev => ({
          ...prev,
          [randomNpc.id]: randomSpeech,
        }));
        setTimeout(() => {
          setNpcSpeeches(prev => {
            const next = { ...prev };
            delete next[randomNpc.id];
            return next;
          });
        }, 5500);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [npcs]);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(1.8, Math.max(0.6, prev + delta)));
  };

  const handleResetCamera = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pIso = toIso(playerPos.x, playerPos.y);
    setScale(1);
    setPan({
      x: rect.width / 2 - pIso.x,
      y: rect.height / 2 - pIso.y - 40,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Humanized, leisurely strolling along BFS path preventing passing through trees & buildings
  // User: "pergerakan avatar saat bergerak ke arah krusor buat pelan-pelan"
  const moveToCoordinate = useCallback((targetX: number, targetY: number, onArrival?: () => void) => {
    // Cancel any ongoing walk animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // If currently sitting, stand up smoothly
    if (isSitting) {
      setIsSitting(false);
      setSittingBenchId(null);
    }

    const startGx = Math.round(playerPos.x);
    const startGy = Math.round(playerPos.y);

    const waypoints = findPath(startGx, startGy, targetX, targetY);
    if (waypoints.length <= 1) {
      if (onArrival) onArrival();
      return;
    }

    setIsWalking(true);
    sounds.playFootstep();

    // Leisurely, peaceful stroll pacing: 550ms per tile step
    const STEP_DURATION = 550;
    let stepIndex = 0;

    const executeNextStep = () => {
      if (stepIndex >= waypoints.length - 1) {
        setIsWalking(false);
        setWalkPhase(0);
        const finalWaypoint = waypoints[waypoints.length - 1];
        setPlayerPos(finalWaypoint);
        if (onPlayerMove) {
          onPlayerMove(finalWaypoint);
        }
        if (onArrival) {
          onArrival();
        }
        return;
      }

      const fromPoint = waypoints[stepIndex];
      const toPoint = waypoints[stepIndex + 1];
      setFacingLeft(toPoint.x < fromPoint.x || (toPoint.x === fromPoint.x && toPoint.y > fromPoint.y));

      const stepStartTime = performance.now();
      sounds.playFootstep();

      const stepAnimation = (time: number) => {
        const elapsed = time - stepStartTime;
        const progress = Math.min(1, elapsed / STEP_DURATION);
        // Smooth S-curve easing
        const ease = progress * progress * (3 - 2 * progress);

        const currentX = fromPoint.x + (toPoint.x - fromPoint.x) * ease;
        const currentY = fromPoint.y + (toPoint.y - fromPoint.y) * ease;

        setPlayerPos({ x: currentX, y: currentY });

        // Natural leg swing gait cycle
        const currentPhase = (elapsed / 275) * Math.PI * 2;
        setWalkPhase(currentPhase);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(stepAnimation);
        } else {
          stepIndex++;
          executeNextStep();
        }
      };

      animFrameRef.current = requestAnimationFrame(stepAnimation);
    };

    executeNextStep();
  }, [playerPos, isSitting, findPath, onPlayerMove]);

  // Click on building:
  // Info is shown in header, and avatar walks safely to entrance without penetrating building
  const handleBuildingTouch = (e: React.MouseEvent, b: Building) => {
    e.stopPropagation();
    sounds.playPop();

    // Notify parent to display info in the Header (underneath icon, name, saldo)
    onSelectBuilding(b);

    const entranceMap: Record<string, { x: number; y: number }> = {
      perpustakaan: { x: 3, y: 4 },
      dewankota: { x: 6, y: 3 },
      menara: { x: 7, y: 4 },
      polisi: { x: 3, y: 7 },
      kafe: { x: 6, y: 7 },
      toko: { x: 4, y: 7 },
      bandara: { x: 8, y: 8 },
      alunalun: { x: 5, y: 6 },
    };

    const entrance = entranceMap[b.id] || { x: b.gridX, y: b.gridY + 1 };
    moveToCoordinate(entrance.x, entrance.y);
  };

  const handleTileClick = (gx: number, gy: number) => {
    if (isDragging) return;
    if (isObstacleTile(gx, gy)) {
      // If clicking an obstacle directly, still navigate to closest neighbor
      moveToCoordinate(gx, gy);
      return;
    }
    moveToCoordinate(gx, gy);
  };

  // Seating / Tempat Duduk click handler
  const handleBenchClick = (bench: { id: string; name: string; gx: number; gy: number }) => {
    sounds.playPop();

    if (isSitting && sittingBenchId === bench.id) {
      // Stand up if already sitting here
      setIsSitting(false);
      setSittingBenchId(null);
      return;
    }

    moveToCoordinate(bench.gx, bench.gy, () => {
      setIsSitting(true);
      setSittingBenchId(bench.id);
      sounds.playPop();
    });
  };

  const handleStandUp = () => {
    setIsSitting(false);
    setSittingBenchId(null);
    sounds.playPop();
  };

  const isRoadTile = (gx: number, gy: number) => {
    if (gx === 5 || gy === 5) return true;
    if ((gx >= 2 && gx <= 9 && (gy === 2 || gy === 8)) || (gy >= 2 && gy <= 8 && (gx === 2 || gx === 9))) {
      return true;
    }
    if (gx === 7 && gy === 6) return true;
    if (gx === 6 && gy === 3) return true;
    return false;
  };


  const streetLamps = [
    { x: 3, y: 3 },
    { x: 7, y: 3 },
    { x: 3, y: 7 },
    { x: 7, y: 7 },
    { x: 5, y: 3 },
    { x: 5, y: 7 },
    { x: 3, y: 5 },
    { x: 7, y: 5 },
  ];

  const fireflies = [
    { x: 4.2, y: 3.8, delay: '0s' },
    { x: 6.5, y: 3.6, delay: '1.2s' },
    { x: 3.5, y: 6.2, delay: '2.5s' },
    { x: 6.8, y: 6.5, delay: '0.8s' },
    { x: 1.5, y: 4.8, delay: '1.9s' },
    { x: 8.5, y: 1.8, delay: '3.1s' },
    { x: 5.2, y: 4.8, delay: '0.4s' },
    { x: 7.2, y: 7.2, delay: '2.1s' },
    { x: 2.8, y: 9.2, delay: '1.5s' },
    { x: 9.8, y: 8.2, delay: '2.8s' },
  ];

  // 
  // RENDER BUILDINGS EXACTLY MATCHING USER SCREENSHOTS:
  // 1. Perpustakaan (Image 7): Neoclassical 3-story, columns, pediment, flagpole, and smooth Kubah Emas!
  // 2. Dewan Kota (Image 1): Modern hall, sign "DEWAN KOTA", split-leaf green dome on round pedestal!
  // 3. Menara Siaran (Image 2): Compound with fence, cabin, power boxes, tall teal steel mast, "ON AIR" badge!
  // 4. Kantor Polisi (Image 4): 2-story navy blue trim, "KANTOR POLISI", entrance spotlights, 2 police cruisers!
  // 5. Kafe / Toko Roti (Image 5): Double-shopfront with red/white & blue/white awnings, benches!
  // 6. Toko Poin (Image 6): 3-story boutique with crimson awnings over every window, large striped canopy!
  // 7. Bandara (Image 3): Terminal with "BANDARA" sign, skybridges, parking cars, tall white tower!
  // 8. Alun-alun: Central plaza with concentric cobblestone paving and tiered fountain!
  const renderBuilding = (b: Building) => {
    const iso = toIso(b.gridX, b.gridY);
    // Exact isometric foundation ground anchors (matching the foundation diamond center in each SVG)
    const baseAnchors: Record<string, { x: number; y: number }> = {
      perpustakaan: { x: 85, y: 105 },
      dewankota: { x: 85, y: 105 },
      menara: { x: 80, y: 108 },
      polisi: { x: 85, y: 105 },
      kafe: { x: 85, y: 105 },
      toko: { x: 85, y: 105 },
      bandara: { x: 90, y: 105 },
      alunalun: { x: 90, y: 106 },
    };
    const anchor = baseAnchors[b.id] || { x: 85, y: 105 };
    const isSelected = selectedBuilding?.id === b.id;

    return (
      <div
        key={b.id}
        onClick={(e) => handleBuildingTouch(e, b)}
        className="absolute cursor-pointer select-none group"
        style={{
          left: `${iso.x}px`,
          top: `${iso.y}px`,
          transform: `translate(-${anchor.x}px, -${anchor.y}px)`,
          zIndex: Math.floor((b.gridX + b.gridY) * 10) + 15,
        }}
      >
        <div className="relative">
          {/* Active selection beacon indicator on selected building */}
          {isSelected && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none animate-bounce z-50">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold shadow-md whitespace-nowrap border border-amber-300">
                📍 {b.name}
              </span>
              <span className="w-1.5 h-1.5 bg-amber-400 rotate-45 -mt-0.5" />
            </div>
          )}
          {/* 1. PERPUSTAKAAN PUSAT (KUBAH EMAS) - Matching Screenshot 7 */}
          {b.id === 'perpustakaan' && (
            <svg width="170" height="150" viewBox="0 0 170 150" className="overflow-visible">
              {/* Foundation Contact Shadow */}
              <polygon points="85,138 150,105 85,72 20,105" fill="rgba(0,0,0,0.36)" />
              {/* Grounded Isometric Base Slab */}
              <polygon points="85,134 146,103 85,73 24,103" fill="#D5DDD2" />
              <polygon points="24,103 85,134 85,138 24,107" fill="#B0BAAC" />
              <polygon points="85,134 146,103 146,107 85,138" fill="#8E998B" />
              {/* Left Green Lawn & Hedge */}
              <polygon points="46,114 68,103 52,95 30,106" fill="#67B167" />
              <rect x="36" y="96" width="22" height="6" rx="2" fill="#2E7D32" transform="rotate(-15 36 96)" />
              {/* Flagpole on Left Lawn */}
              <line x1="33" y1="104" x2="33" y2="48" stroke="#718096" strokeWidth="2" />
              <circle cx="33" cy="48" r="2.5" fill="#F59E0B" />
              {/* Waving National Flag */}
              <polygon points="34,50 49,52 49,60 34,58" fill="#0D9488" />
              <rect x="34" y="53" width="15" height="3" fill="#FBBF24" />
              {/* Roadside Sign Board "PERPUSTAKAAN" */}
              <polygon points="62,130 92,115 92,107 62,122" fill="#1E293B" />
              <text x="77" y="121" fill="#FEF08A" fontSize="5.5" fontWeight="bold" transform="rotate(-16 77 121)">
                PERPUSTAKAAN
              </text>
              {/* Neoclassical Main 3-Story Hall */}
              <polygon points="38,88 95,116 95,48 38,20" fill="#E8E5DF" />
              <polygon points="95,116 148,90 148,22 95,48" fill="#C9C4BC" />
              {/* Grid Windows on Right Facade */}
              {[
                { x: 104, y: 56 }, { x: 118, y: 50 }, { x: 132, y: 43 },
                { x: 104, y: 68 }, { x: 118, y: 62 }, { x: 132, y: 55 },
                { x: 104, y: 80 }, { x: 118, y: 74 }, { x: 132, y: 67 },
              ].map((w, idx) => (
                <rect key={idx} x={w.x} y={w.y} width="7" height="9" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
              ))}
              {/* Entrance Portico with Triangular White Pediment */}
              <polygon points="40,56 75,73 75,32 40,15" fill="#F8FAFC" />
              <polygon points="40,32 75,49 88,43 53,26" fill="#F8FAFC" />
              {/* Classical Columns */}
              <rect x="48" y="44" width="4" height="42" fill="#F8FAFC" stroke="#E2E8F0" />
              <rect x="58" y="49" width="4" height="42" fill="#F8FAFC" stroke="#E2E8F0" />
              <rect x="68" y="54" width="4" height="42" fill="#F8FAFC" stroke="#E2E8F0" />
              {/* Triangular Pediment Face */}
              <polygon points="38,36 78,56 38,18" fill="#E2E8F0" />
              <circle cx="58" cy="38" r="3" fill="#F59E0B" />
              {/* MAGNIFICENT GOLDEN DOME ON CYLINDRICAL BASE */}
              <ellipse cx="90" cy="36" rx="28" ry="14" fill="#CBD5E1" />
              <ellipse cx="90" cy="32" rx="26" ry="13" fill="#F59E0B" />
              <path d="M64 32 C64 0, 116 0, 116 32 Z" fill="url(#libraryGoldDome)" />
              {/* Golden Finial Spire */}
              <line x1="90" y1="0" x2="90" y2="-10" stroke="#FDE68A" strokeWidth="2.5" />
              <circle cx="90" cy="-10" r="2.5" fill="#FDE68A" />
              <defs>
                <linearGradient id="libraryGoldDome" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D97706" />
                  <stop offset="40%" stopColor="#FDE68A" />
                  <stop offset="70%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {/* 2. DEWAN KOTA (KUBAH HIJAU BELAH) - Matching Screenshot 1 */}
          {b.id === 'dewankota' && (
            <svg width="170" height="150" viewBox="0 0 170 150" className="overflow-visible">
              <polygon points="85,138 150,105 85,72 20,105" fill="rgba(0,0,0,0.36)" />
              <polygon points="85,134 146,103 85,73 24,103" fill="#D5DDD2" />
              <polygon points="24,103 85,134 85,138 24,107" fill="#B0BAAC" />
              <polygon points="85,134 146,103 146,107 85,138" fill="#8E998B" />
              {/* Left Lawn, Hedge, and Flagpole */}
              <polygon points="46,114 68,103 52,95 30,106" fill="#67B167" />
              <rect x="36" y="96" width="22" height="6" rx="2" fill="#2E7D32" transform="rotate(-15 36 96)" />
              <line x1="33" y1="104" x2="33" y2="48" stroke="#718096" strokeWidth="2" />
              <circle cx="33" cy="48" r="2.5" fill="#F59E0B" />
              <polygon points="34,50 49,52 49,60 34,58" fill="#0D9488" />
              <rect x="34" y="53" width="15" height="3" fill="#FBBF24" />
              {/* Sign Board "DEWAN KOTA" on Roadside */}
              <polygon points="62,130 92,115 92,107 62,122" fill="#1E293B" />
              <text x="77" y="121" fill="#6EE7B7" fontSize="5.5" fontWeight="bold" transform="rotate(-16 77 121)">
                DEWAN KOTA
              </text>
              {/* Modern White Civic Building */}
              <polygon points="36,86 95,115 95,60 36,31" fill="#FAF8F5" />
              <polygon points="95,115 148,89 148,34 95,60" fill="#E2E8F0" />
              <polygon points="36,31 95,60 148,34 89,05" fill="#CBD5E1" />
              {/* Facade Text "DEWAN KOTA" */}
              <text x="65" y="86" fill="#065F46" fontSize="7" fontWeight="bold" transform="rotate(22 65 86)">
                DEWAN KOTA
              </text>
              {/* Entrance Arches with Glass */}
              <path d="M42 84 C42 76, 47 76, 47 84" stroke="#0284C7" strokeWidth="2" fill="none" />
              <path d="M50 88 C50 80, 55 80, 55 88" stroke="#0284C7" strokeWidth="2" fill="none" />
              <path d="M72 99 C72 91, 77 91, 77 99" stroke="#0284C7" strokeWidth="2" fill="none" />
              <path d="M80 103 C80 95, 85 95, 85 103" stroke="#0284C7" strokeWidth="2" fill="none" />
              {/* Round Pedestal Seats in Front */}
              <circle cx="56" cy="100" r="3" fill="#FFFFFF" />
              <circle cx="64" cy="104" r="3" fill="#FFFFFF" />
              <circle cx="78" cy="111" r="3" fill="#FFFFFF" />
              {/* Side Windows */}
              {[
                { x: 104, y: 70 }, { x: 118, y: 63 }, { x: 132, y: 56 },
                { x: 104, y: 84 }, { x: 118, y: 77 }, { x: 132, y: 70 },
              ].map((w, idx) => (
                <rect key={idx} x={w.x} y={w.y} width="7" height="9" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
              ))}
              {/* Circular Pedestal for Dome */}
              <ellipse cx="88" cy="38" rx="36" ry="18" fill="#F1F5F9" />
              {/* SPLIT GREEN DOME (KUBAH HIJAU BELAH DUA DENGAN GARIS LENGKUNG) */}
              <g transform="translate(88, 32)">
                {/* Left Dome Half */}
                <path d="M-2 4 C-2 -30, -38 -20, -38 4 Z" fill="#059669" />
                <path d="M-2 4 C-2 -28, -32 -16, -32 4" stroke="#6EE7B7" strokeWidth="1.2" fill="none" />
                <path d="M-2 4 C-2 -24, -22 -12, -22 4" stroke="#6EE7B7" strokeWidth="1.2" fill="none" />
                <path d="M-2 4 C-2 -18, -12 -06, -12 4" stroke="#6EE7B7" strokeWidth="1.2" fill="none" />
                {/* Right Dome Half */}
                <path d="M2 4 C2 -30, 38 -20, 38 4 Z" fill="#047857" />
                <path d="M2 4 C2 -28, 32 -16, 32 4" stroke="#6EE7B7" strokeWidth="1.2" fill="none" />
                <path d="M2 4 C2 -24, 22 -12, 22 4" stroke="#6EE7B7" strokeWidth="1.2" fill="none" />
                <path d="M2 4 C2 -18, 12 -06, 12 4" stroke="#6EE7B7" strokeWidth="1.2" fill="none" />
              </g>
            </svg>
          )}

          {/* 3. MENARA SIARAN (ON AIR) - Matching Screenshot 2 */}
          {b.id === 'menara' && (
            <svg width="160" height="165" viewBox="0 0 160 165" className="overflow-visible">
              <polygon points="80,140 145,108 80,75 15,108" fill="rgba(0,0,0,0.36)" />
              {/* Compound Base with White Fence */}
              <polygon points="80,136 142,105 80,75 18,105" fill="#CBD5E1" />
              <polygon points="18,105 80,136 142,105 80,75" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
              {/* Studio Generator Cabin on the Left */}
              <polygon points="26,104 64,123 64,96 26,77" fill="#1E3A3A" />
              <polygon points="64,123 86,112 86,85 64,96" fill="#132727" />
              <polygon points="26,77 64,96 86,85 48,66" fill="#294D4D" />
              <rect x="40" y="74" width="12" height="7" rx="1" fill="#E2E8F0" />
              {/* Power Generator Boxes (Grey & Yellow) */}
              <rect x="68" y="112" width="8" height="7" fill="#94A3B8" />
              <rect x="78" y="116" width="16" height="9" fill="#EAB308" />
              {/* Tower Base & Tall Structural Lattice Teal Steel Mast */}
              <g transform="translate(102, 108)">
                <line x1="-28" y1="0" x2="-8" y2="-96" stroke="#2D6A6A" strokeWidth="3.2" />
                <line x1="28" y1="0" x2="8" y2="-96" stroke="#1F4D4D" strokeWidth="3.2" />
                {/* Horizontal & Cross Bracings */}
                <line x1="-24" y1="-22" x2="24" y2="-22" stroke="#2D6A6A" strokeWidth="1.8" />
                <line x1="-20" y1="-44" x2="20" y2="-44" stroke="#2D6A6A" strokeWidth="1.8" />
                <line x1="-15" y1="-68" x2="15" y2="-68" stroke="#2D6A6A" strokeWidth="1.8" />
                <line x1="-11" y1="-88" x2="11" y2="-88" stroke="#2D6A6A" strokeWidth="1.8" />
                {/* Mid-tower Platform */}
                <polygon points="0,-48 24,-40 0,-32 -24,-40" fill="#94A3B8" />
                {/* Microwave Dish Antennas */}
                <circle cx="-14" cy="-40" r="5" fill="#E2E8F0" stroke="#64748B" />
                <circle cx="16" cy="-42" r="5" fill="#CBD5E1" stroke="#64748B" />
                {/* Top Panel Antennas */}
                <rect x="-8" y="-112" width="4" height="16" fill="#94A3B8" />
                <rect x="4" y="-112" width="4" height="16" fill="#94A3B8" />
                {/* Mast Beacon Tip */}
                <line x1="0" y1="-96" x2="0" y2="-120" stroke="#F87171" strokeWidth="2.5" />
                <circle cx="0" cy="-120" r="3.5" fill="#EF4444" className="animate-pulse" />
                {/* Radio Waves */}
                <path d="M-12 -122 C-12 -130, 12 -130, 12 -122" stroke="#38BDF8" strokeWidth="1.5" fill="none" opacity="0.8" />
                <path d="M-18 -124 C-18 -135, 18 -135, 18 -124" stroke="#38BDF8" strokeWidth="1.5" fill="none" opacity="0.5" />
                {/* RED "ON AIR" BADGE */}
                <rect x="-18" y="-140" width="36" height="14" rx="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                <text x="0" y="-130" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">
                  ON AIR
                </text>
              </g>
            </svg>
          )}

          {/* 4. KANTOR POLISI - Matching Screenshot 4 */}
          {b.id === 'polisi' && (
            <svg width="170" height="150" viewBox="0 0 170 150" className="overflow-visible">
              <polygon points="85,138 150,105 85,72 20,105" fill="rgba(0,0,0,0.36)" />
              <polygon points="85,134 146,103 85,73 24,103" fill="#E2E8F0" />
              {/* Left Lawn & "POLISI" Signboard */}
              <polygon points="46,114 68,103 52,95 30,106" fill="#67B167" />
              <polygon points="34,106 58,94 58,88 34,100" fill="#1D4ED8" />
              <text x="46" y="98" fill="#FFFFFF" fontSize="5.5" fontWeight="bold" transform="rotate(-16 46 98)">
                POLISI
              </text>
              {/* Flagpole on Right */}
              <line x1="140" y1="104" x2="140" y2="48" stroke="#718096" strokeWidth="2" />
              <circle cx="140" cy="48" r="2.5" fill="#F59E0B" />
              <polygon points="141,50 156,52 156,60 141,58" fill="#0D9488" />
              <rect x="141" y="53" width="15" height="3" fill="#FBBF24" />
              {/* 2-Story Building with Navy Blue Roof Trim */}
              <polygon points="42,88 98,116 98,48 42,20" fill="#FAF8F5" />
              <polygon points="98,116 142,94 142,26 98,48" fill="#CBD5E1" />
              <polygon points="38,20 98,50 144,26 84,-04" fill="#1E3A8A" />
              <polygon points="42,18 98,46 140,25 84, -01" fill="#E2E8F0" />
              {/* Roof AC Units & Blue Skylight */}
              <rect x="74" y="16" width="12" height="7" rx="1" fill="#FFFFFF" stroke="#94A3B8" />
              <rect x="86" y="24" width="12" height="7" rx="1" fill="#FFFFFF" stroke="#94A3B8" />
              <rect x="112" y="24" width="9" height="7" fill="#3B82F6" />
              {/* Front Facade "KANTOR POLISI" Sign on Blue Canopy */}
              <polygon points="40,88 98,117 98,110 40,81" fill="#1E40AF" />
              <text x="69" y="103" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" transform="rotate(22 69 103)">
                KANTOR POLISI
              </text>
              {/* Entrance Pillars with Floor Spotlights */}
              <circle cx="58" cy="100" r="3.5" fill="#FFFFFF" opacity="0.9" />
              <circle cx="68" cy="105" r="3.5" fill="#FFFFFF" opacity="0.9" />
              <circle cx="78" cy="110" r="3.5" fill="#FFFFFF" opacity="0.9" />
              <circle cx="88" cy="115" r="3.5" fill="#FFFFFF" opacity="0.9" />
              {/* Front Windows */}
              {[
                { x: 46, y: 38 }, { x: 58, y: 44 }, { x: 70, y: 50 }, { x: 82, y: 56 },
                { x: 46, y: 56 }, { x: 58, y: 62 }, { x: 70, y: 68 }, { x: 82, y: 74 },
              ].map((w, idx) => (
                <rect key={idx} x={w.x} y={w.y} width="7" height="8" rx="1" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="0.8" />
              ))}
              {/* TWO POLICE CARS PARKED IN FRONT */}
              {/* Car 1: White Police Cruiser with Siren */}
              <g transform="translate(52, 114)">
                <polygon points="0,6 16,14 26,9 10,1" fill="#F8FAFC" stroke="#64748B" strokeWidth="0.5" />
                <polygon points="4,4 12,8 18,5 10,1" fill="#0284C7" />
                <circle cx="11" cy="4" r="1.8" fill="#EF4444" />
                <circle cx="13" cy="5" r="1.8" fill="#3B82F6" />
              </g>
              {/* Car 2: Black Patrol Car with Siren */}
              <g transform="translate(72, 124)">
                <polygon points="0,6 16,14 26,9 10,1" fill="#0F172A" />
                <polygon points="4,4 12,8 18,5 10,1" fill="#334155" />
                <circle cx="11" cy="4" r="1.8" fill="#EF4444" />
                <circle cx="13" cy="5" r="1.8" fill="#3B82F6" />
              </g>
            </svg>
          )}

          {/* 5. KAFE & TOKO ROTI - Matching Screenshot 5 */}
          {b.id === 'kafe' && (
            <svg width="170" height="150" viewBox="0 0 170 150" className="overflow-visible">
              <polygon points="85,138 150,105 85,72 20,105" fill="rgba(0,0,0,0.36)" />
              <polygon points="85,134 146,103 85,73 24,103" fill="#EAE5DE" />
              {/* Dual Shopfront: Shop 1 (Grey/White) & Shop 2 (Warm Tan) */}
              {/* Left Shop: Toko Roti */}
              <polygon points="34,80 72,99 72,48 34,29" fill="#E2E8F0" />
              <polygon points="34,29 72,48 108,30 70,11" fill="#475569" />
              <polygon points="36,28 72,46 106,29 70,13" fill="#E2E8F0" />
              {/* Red-and-White Striped Awning */}
              <g transform="translate(24, 76)">
                <polygon points="0,0 48,24 48,16 0,-8" fill="#EF4444" />
                {[4, 12, 20, 28, 36, 44].map(x => (
                  <polygon key={x} points={`${x},${x/2} ${x+4},${(x+4)/2} ${x+4},${(x+4)/2-8} ${x},${x/2-8}`} fill="#FFFFFF" />
                ))}
              </g>
              <text x="44" y="66" fill="#B91C1C" fontSize="5" fontWeight="bold">TOKO ROTI</text>
              <rect x="30" y="98" width="10" height="4" fill="#92400E" />
              {/* Right Shop: Fotokopi / Kopi */}
              <polygon points="68,96 108,116 108,62 68,42" fill="#D4B996" />
              <polygon points="108,116 142,99 142,45 108,62" fill="#BA9F7C" />
              <polygon points="68,42 108,62 142,45 102,25" fill="#78350F" />
              <polygon points="70,41 108,60 140,44 102,27" fill="#E2E8F0" />
              {/* Blue-and-White Striped Awning */}
              <g transform="translate(60, 92)">
                <polygon points="0,0 48,24 48,16 0,-8" fill="#0284C7" />
                {[4, 12, 20, 28, 36, 44].map(x => (
                  <polygon key={x} points={`${x},${x/2} ${x+4},${(x+4)/2} ${x+4},${(x+4)/2-8} ${x},${x/2-8}`} fill="#FFFFFF" />
                ))}
              </g>
              <text x="80" y="82" fill="#0369A1" fontSize="5" fontWeight="bold">KAFE KOPI</text>
              <rect x="76" y="122" width="14" height="6" fill="#16A34A" />
            </svg>
          )}

          {/* 6. TOKO POIN (BOUTIQUE / HOTEL THALORIA STYLE) - Matching Screenshot 6 */}
          {b.id === 'toko' && (
            <svg width="170" height="150" viewBox="0 0 170 150" className="overflow-visible">
              <polygon points="85,138 150,105 85,72 20,105" fill="rgba(0,0,0,0.36)" />
              <polygon points="85,134 146,103 85,73 24,103" fill="#EAE5DE" />
              {/* 3-Story Boutique with Crimson Red Roof Border */}
              <polygon points="36,88 96,118 96,44 36,14" fill="#E5E7EB" />
              <polygon points="96,118 140,96 140,22 96,44" fill="#D1D5DB" />
              <polygon points="32,14 96,46 144,22 80,-10" fill="#991B1B" />
              <polygon points="36,13 96,43 140,21 80,-07" fill="#E5E7EB" />
              {/* Wide Striped Ground Awning */}
              <g transform="translate(30, 84)">
                <polygon points="0,0 66,33 66,23 0,-10" fill="#991B1B" />
                {[6, 18, 30, 42, 54].map(x => (
                  <polygon key={x} points={`${x},${x/2} ${x+6},${(x+6)/2} ${x+6},${(x+6)/2-10} ${x},${x/2-10}`} fill="#FFFFFF" />
                ))}
              </g>
              {/* Signboard "TOKO POIN" */}
              <text x="64" y="78" fill="#991B1B" fontSize="6.5" fontWeight="bold">TOKO POIN</text>
              {/* Mini Red Awnings over Windows */}
              {[
                { x: 44, y: 34 }, { x: 56, y: 40 }, { x: 68, y: 46 }, { x: 80, y: 52 },
                { x: 44, y: 50 }, { x: 56, y: 56 }, { x: 68, y: 62 }, { x: 80, y: 68 },
              ].map((w, idx) => (
                <g key={idx}>
                  <rect x={w.x} y={w.y} width="7" height="9" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="0.8" />
                  <polygon points={`${w.x-1},${w.y} ${w.x+8},${w.y+4} ${w.x+8},${w.y+2} ${w.x-1},${w.y-2}`} fill="#EF4444" />
                </g>
              ))}
              {/* Vertical Sign Pillar on Right Corner */}
              <rect x="96" y="92" width="5" height="26" fill="#DC2626" />
              <text x="98.5" y="104" fill="#FFFFFF" fontSize="5" fontWeight="bold">T</text>
              <text x="98.5" y="110" fill="#FFFFFF" fontSize="5" fontWeight="bold">O</text>
              <text x="98.5" y="116" fill="#FFFFFF" fontSize="5" fontWeight="bold">K</text>
            </svg>
          )}

          {/* 7. BANDARA VOKASI - Matching Screenshot 3 */}
          {b.id === 'bandara' && (
            <svg width="180" height="150" viewBox="0 0 180 150" className="overflow-visible">
              <polygon points="90,140 160,105 90,70 20,105" fill="rgba(0,0,0,0.36)" />
              <polygon points="90,136 156,103 90,72 24,103" fill="#B4C0A4" />
              {/* Airport Parking Lot with Colorful Cars on the Left */}
              <polygon points="20,95 50,110 38,116 08,101" fill="#94A3B8" />
              {/* Yellow Car */}
              <polygon points="12,98 22,103 18,105 08,100" fill="#EAB308" />
              {/* Red Car */}
              <polygon points="26,105 36,110 32,112 22,107" fill="#EF4444" />
              {/* Blue Car */}
              <polygon points="06,106 16,111 12,113 02,108" fill="#3B82F6" />
              {/* Terminal Building with Bold Red "BANDARA" Sign */}
              <polygon points="34,84 96,115 96,48 34,17" fill="#E2E8F0" />
              <polygon points="96,115 138,94 138,27 96,48" fill="#CBD5E1" />
              <polygon points="34,17 96,48 138,27 76,-04" fill="#334155" />
              {/* Rooftop AC Units */}
              <rect x="68" y="18" width="14" height="8" rx="1" fill="#E2E8F0" />
              <rect x="80" y="28" width="14" height="8" rx="1" fill="#E2E8F0" />
              {/* Front Facade Text "BANDARA" */}
              <text x="65" y="86" fill="#DC2626" fontSize="8" fontWeight="bold" transform="rotate(22 65 86)">
                BANDARA
              </text>
              {/* Blue Glass Ribbon Windows */}
              <polygon points="36,46 94,75 94,62 36,33" fill="#60A5FA" opacity="0.8" />
              <polygon points="36,68 94,97 94,84 36,55" fill="#60A5FA" opacity="0.8" />
              {/* Passenger Skybridge Walkways */}
              <polygon points="12,102 36,114 44,110 20,98" fill="#CBD5E1" />
              <line x1="20" y1="106" x2="20" y2="114" stroke="#475569" strokeWidth="2" />
              <line x1="36" y1="114" x2="36" y2="122" stroke="#475569" strokeWidth="2" />
              {/* Road Direction Sign */}
              <polygon points="86,128 108,117 108,111 86,122" fill="#0F172A" />
              <text x="97" y="118" fill="#FEF08A" fontSize="4.5" fontWeight="bold" transform="rotate(-16 97 118)">
                TERMINAL ✈
              </text>
              {/* TALL CYLINDRICAL AIR TRAFFIC CONTROL TOWER */}
              <g transform="translate(138, 92)">
                <ellipse cx="0" cy="24" rx="16" ry="8" fill="#E2E8F0" />
                {/* Tower Shaft */}
                <rect x="-12" y="-36" width="24" height="60" fill="#E2E8F0" />
                <path d="M-12 24 C-12 28, 12 28, 12 24 L12 -36 L-12 -36 Z" fill="#E2E8F0" />
                {/* 360-degree Glass Cab */}
                <ellipse cx="0" cy="-36" rx="22" ry="10" fill="#E2E8F0" />
                <rect x="-22" y="-48" width="44" height="12" fill="#0284C7" opacity="0.85" />
                <ellipse cx="0" cy="-48" rx="22" ry="10" fill="#CBD5E1" />
                {/* Tower Antenna with Red Strobe */}
                <line x1="0" y1="-48" x2="0" y2="-62" stroke="#475569" strokeWidth="2" />
                <circle cx="0" cy="-62" r="2.5" fill="#EF4444" />
              </g>
            </svg>
          )}

          {/* 8. ALUN-ALUN REFLEKSIA - Tiered Marble Fountain & Wisdom Tree */}
          {b.id === 'alunalun' && (
            <svg width="180" height="160" viewBox="0 0 180 160" className="overflow-visible">
              <ellipse cx="90" cy="110" rx="80" ry="40" fill="rgba(0,0,0,0.36)" />
              <ellipse cx="90" cy="106" rx="76" ry="38" fill="#E2E8F0" />
              <ellipse cx="90" cy="104" rx="68" ry="34" fill="#CBD5E1" />
              <ellipse cx="90" cy="100" rx="46" ry="23" fill="#38BDF8" opacity="0.8" />
              <ellipse cx="90" cy="100" rx="40" ry="20" fill="#0284C7" opacity="0.65" />
              <polygon points="85,100 90,102 95,100 95,70 90,68 85,70" fill="#F8FAFC" />
              <ellipse cx="90" cy="70" rx="14" ry="7" fill="#0284C7" />
              <path
                d="M90 68 Q80 48 76 75 M90 68 Q100 48 104 75 M90 68 Q90 40 90 75"
                stroke="#E0F2FE"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </svg>
          )}
        </div>
      </div>
    );
  };

  // 
  // ENLARGED MAGNIFICENT TREES (POHON DIPERBESAR)
  // Large lush foliage (88x106) with multi-tiered puffs and deep drop shadows
  const renderTree = (gx: number, gy: number, idx: number) => {
    const iso = toIso(gx, gy);
    return (
      <div
        key={`tree_${idx}`}
        className="absolute pointer-events-none select-none"
        style={{
          left: `${iso.x}px`,
          top: `${iso.y}px`,
          transform: 'translate(-44px, -94px)',
          zIndex: Math.floor((gx + gy) * 10) + 12,
        }}
      >
        <svg width="88" height="106" viewBox="0 0 88 106">
          {/* Deep Ground Contact Shadow */}
          <ellipse cx="44" cy="94" rx="26" ry="10" fill="rgba(0,0,0,0.28)" />
          {/* Sturdy Wood Trunk */}
          <rect x="39" y="58" width="10" height="36" rx="2" fill="#78350F" />
          <path d="M39 88 L34 94 L44 94 Z" fill="#582506" />
          <path d="M49 88 L54 94 L44 94 Z" fill="#582506" />
          {/* Multi-layered Vibrant Foliage Canopy */}
          <circle cx="44" cy="46" r="28" fill={isDarkMode ? '#065F46' : '#15803D'} />
          <circle cx="32" cy="34" r="20" fill={isDarkMode ? '#047857' : '#16A34A'} />
          <circle cx="56" cy="32" r="22" fill={isDarkMode ? '#059669' : '#22C55E'} />
          <circle cx="44" cy="22" r="18" fill={isDarkMode ? '#10B981' : '#4ADE80'} />
          <circle cx="38" cy="18" r="12" fill={isDarkMode ? '#34D399' : '#86EFAC'} opacity="0.6" />
        </svg>
      </div>
    );
  };

  // Render Other Online Classmates / NPCs with wandering animations
  const renderNpc = (npc: LocalNpcState) => {
    const iso = toIso(npc.position.x, npc.position.y);
    const speech = npcSpeeches[npc.id];

    return (
      <div
        key={npc.id}
        className="absolute pointer-events-none select-none transition-transform duration-75"
        style={{
          left: `${iso.x}px`,
          top: `${iso.y}px`,
          transform: 'translate(-50%, -96%)',
          zIndex: Math.floor((npc.position.x + npc.position.y) * 10) + 20,
        }}
      >
        <div className="flex flex-col items-center">
          <div className="text-[9px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-tight whitespace-nowrap mb-0.5">
            @{npc.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10)}
          </div>

          {npc.role === 'guru' && (
            <div className="text-[7px] font-bold px-1 rounded bg-amber-500 text-white shadow-sm mb-0.5">
              GURU
            </div>
          )}

          <AvatarView
            avatar={npc.avatar}
            size="sm"
            role={npc.role}
            isWalking={npc.isWalking}
            walkPhase={npc.walkPhase || 0}
            facingLeft={npc.facingLeft}
            speechText={speech}
          />
        </div>
      </div>
    );
  };

  //
  // RENDER INTERACTIVE BENCHES ("TEMPAT DUDUK")
  // User: "buatkan tempat duduk"
  // Beautiful wooden, stone, and cafe terrace benches that avatars can sit on
  const renderBench = (bench: (typeof BENCHES)[0]) => {
    const iso = toIso(bench.gx, bench.gy);
    const isOccupied = isSitting && sittingBenchId === bench.id;

    return (
      <div
        key={bench.id}
        onClick={(e) => {
          e.stopPropagation();
          handleBenchClick(bench);
        }}
        className="absolute cursor-pointer select-none group"
        style={{
          left: `${iso.x}px`,
          top: `${iso.y}px`,
          transform: 'translate(-28px, -22px)',
          zIndex: Math.floor((bench.gx + bench.gy) * 10) + 11,
        }}
        title={bench.label}
      >
        <div className="relative">
          {/* Tooltip on hover */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[9px] font-bold shadow-md border border-slate-700">
              {isOccupied ? 'Klik untuk Berdiri 🚶' : `🪑 ${bench.name}`}
            </span>
          </div>

          {bench.type === 'park' && (
            <svg width="56" height="40" viewBox="0 0 56 40" className="overflow-visible drop-shadow-sm">
              {/* Ground Contact Shadow */}
              <ellipse cx="28" cy="33" rx="20" ry="6" fill="rgba(0,0,0,0.26)" />
              {/* Iron Legs */}
              <line x1="14" y1="26" x2="14" y2="33" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="42" y1="26" x2="42" y2="33" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="22" x2="20" y2="30" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
              <line x1="46" y1="22" x2="46" y2="30" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
              {/* Wooden Seat Slats */}
              <polygon points="12,26 38,13 46,17 20,30" fill="#B45309" stroke="#78350F" strokeWidth="0.8" />
              <polygon points="10,23 36,10 40,12 14,25" fill="#D97706" stroke="#92400E" strokeWidth="0.8" />
              {/* Wooden Backrest Slats */}
              <polygon points="12,17 38,04 40,06 14,19" fill="#B45309" stroke="#78350F" strokeWidth="0.8" />
              <polygon points="10,12 36,00 38,02 12,14" fill="#D97706" stroke="#92400E" strokeWidth="0.8" />
              {/* Iron Armrests */}
              <path d="M10 23 Q8 15 14 17" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M38 11 Q36 03 42 05" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          )}

          {bench.type === 'cafe' && (
            <svg width="60" height="44" viewBox="0 0 60 44" className="overflow-visible drop-shadow-sm">
              {/* Ground Shadow */}
              <ellipse cx="30" cy="36" rx="22" ry="7" fill="rgba(0,0,0,0.26)" />
              {/* Left Chair */}
              <ellipse cx="15" cy="32" rx="7" ry="3.5" fill="#A16207" />
              <line x1="15" y1="32" x2="15" y2="21" stroke="#78350F" strokeWidth="2" />
              <polygon points="11,21 19,21 19,25 11,25" fill="#D97706" />
              {/* Right Chair */}
              <ellipse cx="45" cy="28" rx="7" ry="3.5" fill="#A16207" />
              <line x1="45" y1="28" x2="45" y2="17" stroke="#78350F" strokeWidth="2" />
              <polygon points="41,17 49,17 49,21 41,21" fill="#D97706" />
              {/* Round Bistro Table */}
              <line x1="30" y1="26" x2="30" y2="37" stroke="#475569" strokeWidth="3" />
              <ellipse cx="30" cy="37" rx="8" ry="3" fill="#334155" />
              <ellipse cx="30" cy="25" rx="15" ry="7.5" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
              <ellipse cx="30" cy="24" rx="12" ry="5.5" fill="#F1F5F9" />
              {/* Steaming Coffee Cup */}
              <ellipse cx="30" cy="22" rx="3.5" ry="2" fill="#78350F" />
              <rect x="28" y="19" width="4" height="3" rx="1" fill="#FFFFFF" />
              <path d="M30 18 Q31 15 30 13" stroke="#CBD5E1" strokeWidth="1" fill="none" strokeLinecap="round" className="animate-pulse" />
            </svg>
          )}

          {bench.type === 'stone' && (
            <svg width="56" height="40" viewBox="0 0 56 40" className="overflow-visible drop-shadow-sm">
              {/* Ground Shadow */}
              <ellipse cx="28" cy="32" rx="20" ry="6" fill="rgba(0,0,0,0.26)" />
              {/* Carved Granite Pedestals */}
              <rect x="14" y="24" width="6" height="8" rx="1" fill="#94A3B8" />
              <rect x="36" y="14" width="6" height="8" rx="1" fill="#94A3B8" />
              {/* Marble Slab Top */}
              <polygon points="10,24 36,11 46,16 20,29" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
              <polygon points="10,24 20,29 20,32 10,27" fill="#94A3B8" />
              <polygon points="20,29 46,16 46,19 20,32" fill="#64748B" />
            </svg>
          )}
        </div>
      </div>
    );
  };

  // Render Current Player Avatar (Miniature cute avatar)
  const renderPlayer = () => {
    const iso = toIso(playerPos.x, playerPos.y);

    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${iso.x}px`,
          top: `${iso.y}px`,
          transform: 'translate(-50%, -96%)',
          zIndex: Math.floor((playerPos.x + playerPos.y) * 10) + 25,
        }}
      >
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-tight whitespace-nowrap mb-0.5">
            @{currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10)} (Kamu)
          </div>

          <AvatarView
            avatar={currentUser.avatar}
            size="md"
            role={currentUser.role}
            isWalking={isWalking}
            walkPhase={walkPhase}
            facingLeft={facingLeft}
            isSitting={isSitting}
            speechText={playerSpeechText || (isSitting ? 'Sedang santai ☕' : undefined)}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none transition-colors duration-700 ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#060A14] via-[#0C1427] to-[#121E36]'
          : 'bg-gradient-to-b from-[#87CEEB] via-[#BAE6FD] to-[#E0F2FE]'
      }`}
    >
      {/* Sky Environment */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isDarkMode ? (
          <>
            <div className="absolute top-12 right-24 opacity-90 drop-shadow-[0_0_18px_rgba(254,240,138,0.55)]">
              <svg width="42" height="42" viewBox="0 0 40 40">
                <path
                  d="M30 4 C18 4, 10 14, 10 26 C10 32, 13 36, 16 38 C9 34, 4 26, 4 18 C4 10, 10 4, 18 2 C22 2, 26 3, 30 4 Z"
                  fill="#FEF08A"
                />
              </svg>
            </div>
            <div className="absolute inset-0 opacity-75">
              {[...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                  style={{
                    top: `${(i * 19) % 80}%`,
                    left: `${(i * 23) % 96}%`,
                    opacity: 0.2 + ((i % 5) * 0.16),
                    animationDelay: `${(i % 5) * 0.6}s`,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-8 right-24 drop-shadow-[0_0_35px_rgba(251,191,36,0.85)]">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 animate-sun-spin opacity-70">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                      <line
                        key={deg}
                        x1="40"
                        y1="10"
                        x2="40"
                        y2="2"
                        stroke="#F59E0B"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        transform={`rotate(${deg} 40 40)`}
                      />
                    ))}
                  </svg>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-inner" />
              </div>
            </div>

            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-10 animate-cloud-slow opacity-85">
                <svg width="170" height="60" viewBox="0 0 170 60" fill="white">
                  <path d="M25 45 C15 45 5 35 15 25 C15 15 30 10 40 18 C50 8 70 8 80 18 C90 12 110 12 120 22 C130 18 145 22 145 32 C155 35 155 45 145 45 Z" />
                </svg>
              </div>
              <div className="absolute top-28 animate-cloud-medium opacity-75" style={{ animationDelay: '-14s' }}>
                <svg width="220" height="70" viewBox="0 0 220 70" fill="white">
                  <path d="M30 55 C18 55 8 42 20 30 C20 18 38 12 50 22 C62 10 88 10 100 22 C115 14 140 14 150 26 C165 20 185 26 185 38 C198 42 198 55 185 55 Z" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Isometric World Canvas */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          width: '1px',
          height: '1px',
        }}
      >
        {/* Render Ground Grid Tiles */}
        {Array.from({ length: GRID_SIZE }).map((_, gx) =>
          Array.from({ length: GRID_SIZE }).map((_, gy) => {
            const iso = toIso(gx, gy);
            const isRoad = isRoadTile(gx, gy);
            const isCenterPlaza = gx >= 4 && gx <= 6 && gy >= 4 && gy <= 6;

            let fillColor = isDarkMode ? '#1B3B2B' : '#5E9E5E';
            let strokeColor = isDarkMode ? '#142E22' : '#4C8A4C';

            if (isRoad) {
              fillColor = isDarkMode ? '#E7DFD5' : '#F9F1E3';
              strokeColor = isDarkMode ? '#CFC5B8' : '#E8DCB8';
            } else if (isCenterPlaza) {
              fillColor = isDarkMode ? '#D8D0C5' : '#EFE7DA';
              strokeColor = isDarkMode ? '#B8AFA2' : '#DDD2BF';
            }

            return (
              <div
                key={`${gx}_${gy}`}
                onClick={() => handleTileClick(gx, gy)}
                className="absolute cursor-pointer hover:brightness-105 transition-all"
                style={{
                  left: `${iso.x}px`,
                  top: `${iso.y}px`,
                  transform: 'translate(-48px, -24px)',
                  zIndex: Math.floor((gx + gy) * 10),
                }}
              >
                <svg
                  width={TILE_WIDTH}
                  height={TILE_HEIGHT + 14}
                  viewBox={`0 0 ${TILE_WIDTH} ${TILE_HEIGHT + 14}`}
                >
                  <polygon
                    points={`${TILE_WIDTH / 2},0 ${TILE_WIDTH},${TILE_HEIGHT / 2} ${TILE_WIDTH / 2},${TILE_HEIGHT} 0,${TILE_HEIGHT / 2}`}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="1"
                  />
                  <polygon
                    points={`0,${TILE_HEIGHT / 2} ${TILE_WIDTH / 2},${TILE_HEIGHT} ${TILE_WIDTH / 2},${TILE_HEIGHT + 6} 0,${TILE_HEIGHT / 2 + 6}`}
                    fill={isDarkMode ? '#11251B' : '#468046'}
                  />
                  <polygon
                    points={`${TILE_WIDTH / 2},${TILE_HEIGHT} ${TILE_WIDTH},${TILE_HEIGHT / 2} ${TILE_WIDTH},${TILE_HEIGHT / 2 + 6} ${TILE_WIDTH / 2},${TILE_HEIGHT + 6}`}
                    fill={isDarkMode ? '#0D1D15' : '#396B39'}
                  />
                </svg>
              </div>
            );
          })
        )}

        {/* Warm Streetlights in Night Mode */}
        {isDarkMode &&
          streetLamps.map((lamp, idx) => {
            const iso = toIso(lamp.x, lamp.y);
            return (
              <div
                key={`lamp_${idx}`}
                className="absolute pointer-events-none select-none"
                style={{
                  left: `${iso.x}px`,
                  top: `${iso.y}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor((lamp.x + lamp.y) * 10) + 8,
                }}
              >
                <div
                  className="w-24 h-24 rounded-full opacity-65 blur-md"
                  style={{
                    background: 'radial-gradient(circle, rgba(254, 240, 138, 0.55) 0%, rgba(245, 158, 11, 0.25) 45%, rgba(0,0,0,0) 70%)',
                  }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full -mt-2">
                  <svg width="12" height="24" viewBox="0 0 12 24">
                    <line x1="6" y1="24" x2="6" y2="4" stroke="#475569" strokeWidth="2" />
                    <circle cx="6" cy="4" r="3.5" fill="#FEF08A" />
                    <circle cx="6" cy="4" r="5" fill="#FEF08A" opacity="0.4" className="animate-pulse" />
                  </svg>
                </div>
              </div>
            );
          })}

        {/* Kunang-kunang in Night Mode */}
        {isDarkMode &&
          fireflies.map((ff, idx) => {
            const iso = toIso(ff.x, ff.y);
            return (
              <div
                key={`firefly_${idx}`}
                className="absolute pointer-events-none select-none animate-firefly"
                style={{
                  left: `${iso.x}px`,
                  top: `${iso.y}px`,
                  animationDelay: ff.delay,
                  zIndex: Math.floor((ff.x + ff.y) * 10) + 14,
                }}
              >
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-lime-300/40 blur-xs -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full bg-yellow-200 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_#bef264]" />
                </div>
              </div>
            );
          })}

        {/* ENLARGED TREES (Pohon diperbesar) */}
        {Array.from({ length: GRID_SIZE }).flatMap((_, gx) =>
          Array.from({ length: GRID_SIZE }).map((_, gy) => {
            if (hasTreeTile(gx, gy)) {
              return renderTree(gx, gy, gx * 100 + gy);
            }
            return null;
          })
        )}

        {/* Interactive Benches ("Tempat Duduk") */}
        {BENCHES.map(b => renderBench(b))}

        {/* 8 Clickable Buildings (Matching exact screenshots, grounded on tiles) */}
        {buildings.map(b => renderBuilding(b))}

        {/* Other Online Classmates / NPCs with wandering animations */}
        {npcs.map(npc => renderNpc(npc))}

        {/* Current Active Player Avatar with Continuous Humanoid Walking Loop */}
        {renderPlayer()}
      </div>

      {/* Floating Stand-Up Action when avatar is sitting */}
      {isSitting && (
        <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-bounce">
          <button
            onClick={handleStandUp}
            className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xl border border-emerald-400/60 flex items-center gap-1.5 transition-all active:scale-95"
            title="Bangun dan Berdiri"
          >
            <span>🚶</span>
            <span>Berdiri dari Bangku</span>
          </button>
        </div>
      )}

      {/* Floating Zoom & Center Camera Controls (Thumb-friendly mobile positioning) */}
      <div className="absolute bottom-24 right-3 sm:bottom-6 sm:right-6 flex flex-col gap-2 z-30 pointer-events-auto">
        <button
          onClick={() => handleZoom(0.2)}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 flex items-center justify-center font-bold text-base sm:text-sm active:scale-95 transition-all"
          title="Perbesar Peta (+)"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 flex items-center justify-center font-bold text-base sm:text-sm active:scale-95 transition-all"
          title="Perkecil Peta (-)"
        >
          -
        </button>
        <button
          onClick={handleResetCamera}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 flex items-center justify-center text-sm sm:text-xs active:scale-95 transition-all"
          title="Pusatkan ke Avatarmu"
        >
          📍
        </button>
      </div>
    </div>
  );
};
