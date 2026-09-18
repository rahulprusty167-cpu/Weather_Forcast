import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Layers, Thermometer, Activity, Eye, RotateCw } from 'lucide-react';

/**
 * Substation3DPreview
 * High-performance, lightweight Three.js 3D miniature digital twin of the selected substation yard.
 * Replaces the old static SVG drawing with a real interactive WebGL 3D asset.
 */
export default function Substation3DPreview({ node, status }) {
  const mountRef = useRef(null);
  const [previewMode, setPreviewMode] = useState('isometric'); // 'isometric' | 'thermal'
  const animFrameIdRef = useRef(null);

  const statusColorHex = 
    status === 'CRITICAL' ? 0xf43f5e : 
    status === 'ELEVATED' ? 0xf59e0b : 
    0x10b981;

  const oilTemp = node?.oil_temp_c || 58.3;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b17);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(9, 7.5, 9);
    camera.lookAt(0, 1.2, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.replaceChildren(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    const statusLight = new THREE.PointLight(statusColorHex, 2.0, 12);
    statusLight.position.set(0, 0.5, 0);
    scene.add(statusLight);

    // 4. Build 3D Asset Group
    const yardGroup = new THREE.Group();
    scene.add(yardGroup);

    // Diamond / Square Plinth Base
    const plinthGeo = new THREE.BoxGeometry(5.4, 0.35, 5.4);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.4
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.18;
    yardGroup.add(plinth);

    // Foundation Grid Line Ring
    const ringGeo = new THREE.RingGeometry(2.8, 2.9, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: statusColorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.36;
    yardGroup.add(ring);

    // Main Transformer Tank
    const tankGeo = new THREE.BoxGeometry(2.4, 1.8, 1.9);
    const isThermal = previewMode === 'thermal';
    const tankColor = isThermal 
      ? (status === 'CRITICAL' ? 0xef4444 : status === 'ELEVATED' ? 0xf59e0b : 0x10b981)
      : 0x334155;

    const tankMat = new THREE.MeshStandardMaterial({
      color: tankColor,
      metalness: isThermal ? 0.2 : 0.6,
      roughness: 0.35,
      emissive: isThermal ? tankColor : 0x000000,
      emissiveIntensity: isThermal ? 0.45 : 0.0
    });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 1.25;
    yardGroup.add(tank);

    // Conservator Drum
    const conservatorGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.8, 16);
    const conservatorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
    const conservator = new THREE.Mesh(conservatorGeo, conservatorMat);
    conservator.rotation.z = Math.PI / 2;
    conservator.position.set(0, 2.45, -0.45);
    yardGroup.add(conservator);

    // Radiator Cooling Fins on left and right
    [-1.4, 1.4].forEach(x => {
      for (let f = -0.6; f <= 0.6; f += 0.3) {
        const finGeo = new THREE.BoxGeometry(0.35, 1.4, 0.05);
        const finMat = new THREE.MeshStandardMaterial({
          color: isThermal ? 0xd97706 : 0x475569,
          metalness: 0.7
        });
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(x, 1.25, f);
        yardGroup.add(fin);
      }
    });

    // 3 High Voltage Ceramic Bushings
    [-0.6, 0, 0.6].forEach((bx, idx) => {
      const bGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.8, 12);
      const bMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.1 });
      const b = new THREE.Mesh(bGeo, bMat);
      b.position.set(bx, 2.4, 0.3);
      yardGroup.add(b);

      // Corona glowing ring on top
      const haloGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 16);
      const haloMat = new THREE.MeshBasicMaterial({ color: statusColorHex });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(bx, 2.8, 0.3);
      yardGroup.add(halo);
    });

    // Gantry Tower Steel Pylons on edges
    [-2.2, 2.2].forEach(tx => {
      const pylonGeo = new THREE.BoxGeometry(0.08, 4.2, 0.08);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(tx, 2.1, 1.8);
      yardGroup.add(pylon);
    });

    // Gantry Cross Beam
    const crossGeo = new THREE.BoxGeometry(4.6, 0.08, 0.08);
    const crossMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const cross = new THREE.Mesh(crossGeo, crossMat);
    cross.position.set(0, 4.2, 1.8);
    yardGroup.add(cross);

    // 5. Drag & Rotate Interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      yardGroup.rotation.y += deltaX * 0.015;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 6. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Gentle auto rotation when not dragging
      if (!isDragging) {
        yardGroup.rotation.y += 0.008;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      scene.clear();
    };
  }, [previewMode, status, statusColorHex]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#0b1329] via-[#091022] to-[#060b17] border border-slate-800 shadow-inner group">
      {/* Top Preview Controls Bar */}
      <div className="absolute top-2 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-auto">
        <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-950/80 text-cyan-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Interactive 3D Asset Twin
        </span>

        <div className="flex items-center gap-1 bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 backdrop-blur-md">
          <button
            onClick={() => setPreviewMode('isometric')}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              previewMode === 'isometric'
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Mesh
          </button>
          <button
            onClick={() => setPreviewMode('thermal')}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              previewMode === 'thermal'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Thermal IR
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="w-full h-40 relative overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Thermal overlay sensor callout */}
        {previewMode === 'thermal' && (
          <div className="absolute bottom-2 right-2 text-[9px] font-mono bg-black/80 px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 backdrop-blur-sm pointer-events-none">
            Peak Hotspot: {oilTemp}°C
          </div>
        )}

        <div className="absolute bottom-2 left-2 text-[8px] font-mono text-slate-500 pointer-events-none">
          Drag to rotate 3D view
        </div>
      </div>

      {/* Substation Footprint Metadata Footer */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono flex items-center gap-1">
          <Activity className="w-3 h-3 text-cyan-400" />
          {node.voltage_kv} kV Switchyard
        </span>
        <span className="font-medium text-slate-300">
          Capacity: {node.capacity_mva} MVA
        </span>
      </div>
    </div>
  );
}
