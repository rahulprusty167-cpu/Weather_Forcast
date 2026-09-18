import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  Thermometer, 
  RotateCw, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Eye, 
  Flame,
  Snowflake,
  Wind
} from 'lucide-react';

/**
 * CitizenTransformer3D
 * An interactive 3D neighborhood distribution transformer twin designed specifically
 * for citizens to tangibly see the thermal impact of ambient monsoon heat & residential AC load.
 */
export default function CitizenTransformer3D({
  pincode,
  areaName,
  telemetry,
  prediction
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const tankMeshRef = useRef(null);
  const heatWavesRef = useRef([]);

  const [scanMode, setScanMode] = useState('thermal'); // 'physical' | 'thermal'
  const [interactiveRotate, setInteractiveRotate] = useState(true);

  const loadPct = telemetry?.load_percentage || 74;
  const oilTemp = telemetry?.transformer_oil_temp_c || 64.2;
  const tempRise = telemetry?.temperature_delta_c || 18.5;
  const status = prediction?.status || 'NORMAL';
  const isCritical = status === 'CRITICAL';
  const isElevated = status === 'ELEVATED';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a101f);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 9.5);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    keyLight.position.set(10, 15, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.8);
    rimLight.position.set(-10, 8, -8);
    scene.add(rimLight);

    // 5. Build Distribution Transformer Group
    const transformerGroup = new THREE.Group();
    scene.add(transformerGroup);

    // Concrete utility pole behind transformer
    const poleGeo = new THREE.CylinderGeometry(0.35, 0.45, 14, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 1.5, -1.2);
    transformerGroup.add(pole);

    // Wooden / Steel Crossarm
    const armGeo = new THREE.BoxGeometry(4.2, 0.25, 0.35);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0, 4.8, -1.2);
    transformerGroup.add(arm);

    // 3 Cutout Fuse Insulators on crossarm
    [-1.4, 0, 1.4].forEach(x => {
      const insGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 12);
      const insMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      const ins = new THREE.Mesh(insGeo, insMat);
      ins.position.set(x, 5.2, -1.2);
      transformerGroup.add(ins);
    });

    // Transformer Mounting Bracket Platform
    const platformGeo = new THREE.BoxGeometry(2.4, 0.15, 1.8);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, -0.6, -0.2);
    transformerGroup.add(platform);

    // Main Distribution Transformer Tank (Cylindrical / Rounded)
    const tankGeo = new THREE.CylinderGeometry(1.05, 1.05, 2.6, 32);
    const tankMat = new THREE.MeshStandardMaterial({
      color: scanMode === 'thermal' 
        ? (isCritical ? 0xef4444 : isElevated ? 0xf59e0b : 0x10b981)
        : 0x475569,
      metalness: 0.5,
      roughness: 0.35,
      emissive: scanMode === 'thermal'
        ? (isCritical ? 0xef4444 : isElevated ? 0xd97706 : 0x059669)
        : 0x000000,
      emissiveIntensity: scanMode === 'thermal' ? 0.45 : 0.0
    });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 0.8, -0.2);
    tankMeshRef.current = tank;
    transformerGroup.add(tank);

    // Tank Lid & Lifting Eyes
    const lidGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.18, 32);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.set(0, 2.15, -0.2);
    transformerGroup.add(lid);

    // Radiator Cooling Flutes (Vertical Cooling Tubes on flank)
    for (let angle = -Math.PI * 0.7; angle <= Math.PI * 0.7; angle += Math.PI * 0.25) {
      if (Math.abs(angle) < 0.2) continue; // Leave front clear for nameplate
      const fluteGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
      const fluteMat = new THREE.MeshStandardMaterial({
        color: scanMode === 'thermal' ? 0xf59e0b : 0x64748b,
        metalness: 0.6
      });
      const flute = new THREE.Mesh(fluteGeo, fluteMat);
      const radius = 1.18;
      flute.position.set(
        Math.sin(angle) * radius,
        0.8,
        -0.2 + Math.cos(angle) * radius
      );
      transformerGroup.add(flute);
    }

    // High Voltage Bushings on Top
    [-0.45, 0, 0.45].forEach((bx, idx) => {
      const bGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.8, 12);
      const bMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2 });
      const b = new THREE.Mesh(bGeo, bMat);
      b.position.set(bx, 2.55, -0.2);
      transformerGroup.add(b);

      // Jumper wire to crossarm
      const wireCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(bx, 2.95, -0.2),
        new THREE.Vector3(bx * 1.5, 4.0, -0.7),
        new THREE.Vector3(bx * 2.8, 5.0, -1.2)
      );
      const wireGeo = new THREE.TubeGeometry(wireCurve, 16, 0.02, 6, false);
      const wireMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      transformerGroup.add(wire);
    });

    // Floating Thermal Heat Dispersal Wave Rings
    heatWavesRef.current = [];
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(1.3 + r * 0.25, 0.02, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isCritical ? 0xef4444 : isElevated ? 0xf59e0b : 0x00f0ff,
        transparent: true,
        opacity: 0.35 - r * 0.1
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 1.2 + r * 0.5, -0.2);
      heatWavesRef.current.push(ring);
      transformerGroup.add(ring);
    }

    // 6. Smooth Mouse Tilt Interaction
    let targetRotY = 0;
    let targetRotX = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.65;
      targetRotX = -ny * 0.25;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // 7. Render Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth interpolation to mouse tilt or gentle idle swing
      if (interactiveRotate) {
        transformerGroup.rotation.y += (targetRotY + Math.sin(time * 0.5) * 0.15 - transformerGroup.rotation.y) * 0.05;
        transformerGroup.rotation.x += (targetRotX - transformerGroup.rotation.x) * 0.05;
      }

      // Animate heat waves
      heatWavesRef.current.forEach((ring, idx) => {
        const pulse = 1 + Math.sin(time * 3 + idx) * 0.1;
        ring.scale.set(pulse, pulse, pulse);
        ring.position.y = 1.0 + ((time * 0.4 + idx * 0.6) % 1.6);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
      scene.clear();
    };
  }, [scanMode, status, isCritical, isElevated]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden transition-all duration-300">
      {/* Card Header Bar */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Neighborhood Distribution Transformer 3D Twin
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Pincode {pincode}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {areaName} Feeder Unit • Live Physical Asset Health & Heat Dissipation
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Thermal IR vs Physical */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setScanMode('thermal')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              scanMode === 'thermal'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Thermal IR</span>
          </button>
          <button
            onClick={() => setScanMode('physical')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              scanMode === 'physical'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Physical 3D</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: 3D Canvas + Citizen Impact Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left 3D Viewport Column (7 cols) */}
        <div className="lg:col-span-7 relative h-72 lg:h-80 bg-[#080d1a] overflow-hidden">
          <div ref={mountRef} className="w-full h-full cursor-crosshair" />

          {/* Floating Status Badge on 3D View */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${
              isCritical ? 'bg-rose-500 animate-ping' : isElevated ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`} />
            <span className="font-bold text-white">Core Oil: {oilTemp}°C</span>
            <span className="text-slate-400">(+{tempRise}°C rise)</span>
          </div>

          {/* Interactive Mouse Hint */}
          <div className="absolute bottom-3 right-3 z-10 text-[10px] font-mono text-slate-400 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800">
            Hover mouse to tilt & inspect
          </div>
        </div>

        {/* Right Explainer Column (5 cols) */}
        <div className="lg:col-span-5 p-5 flex flex-col justify-between bg-slate-50/60 border-t lg:border-t-0 lg:border-l border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500">
                Asset Health Summary
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                isCritical ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                isElevated ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {status}
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mb-1.5">
              Why Does My Transformer Heat Up?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              During high humidity and heat index, air conditioner compressors run continuously. When hundreds of homes in <strong className="text-slate-800">{areaName}</strong> turn on ACs simultaneously, the step-down coils reach peak thermal capacity.
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-sans text-slate-500 block mb-0.5">Feeder Loading</span>
                <span className="font-bold text-blue-600 text-sm">{loadPct}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-sans text-slate-500 block mb-0.5">Heat Index Impact</span>
                <span className="font-bold text-amber-600 text-sm">+{tempRise}°C Temp Rise</span>
              </div>
            </div>
          </div>

          {/* Actionable Citizen Takeaway */}
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5">
            <Snowflake className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-900 leading-snug">
              <strong>Tip to Protect Your Local Grid:</strong> Setting your AC to <strong>25°C or 26°C</strong> lowers neighborhood transformer coil stress by ~28% without sacrificing comfort.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
