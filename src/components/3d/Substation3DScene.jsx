import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Thermometer, 
  Zap, 
  Eye, 
  ShieldCheck, 
  AlertTriangle,
  Flame,
  Activity,
  Info,
  Sliders
} from 'lucide-react';

/**
 * Substation3DScene
 * High-fidelity, real-time 3D Digital Twin of a High-Voltage Power Substation Yard & Transformer.
 * Features:
 * - Procedurally built 3D architecture: Gantry towers, insulator strings, transmission lines,
 *   oil-filled power transformer, conservator, Buchholz relay, radiator banks with spinning cooling fans,
 *   HV porcelain bushings with animated corona glow, SF6 circuit breakers.
 * - 3 View Modes:
 *     1. 'physical': Realistic industrial architectural view.
 *     2. 'thermal': Real-time false-color thermal infrared heatmap driven by oil_temp_c.
 *     3. 'emf': Holographic electromagnetic flux & power current flow.
 * - Interactive 3D Hotspot Inspection (Click Bushings, Core, Radiator, Breaker).
 * - Full Orbit, Pan, Zoom, Auto-rotate controls, and clean WebGL disposal.
 */
export default function Substation3DScene({
  substation,
  telemetry,
  status = 'NORMAL',
  height = '520px',
  compact = false
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Dynamic 3D Objects that need animation updates
  const fansRef = useRef([]);
  const coronaRingsRef = useRef([]);
  const currentParticlesRef = useRef(null);
  const coreMeshRef = useRef(null);
  const radiatorMeshesRef = useRef([]);

  // UI State
  const [viewMode, setViewMode] = useState('physical'); // 'physical' | 'thermal' | 'emf'
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  // Status colors
  const statusColorHex = 
    status === 'CRITICAL' ? 0xf43f5e : 
    status === 'ELEVATED' ? 0xf59e0b : 
    0x10b981;

  // Temperature and load metrics
  const oilTemp = telemetry?.transformer_oil_temp_c || 58.5;
  const loadPct = telemetry?.load_percentage || 65;
  const voltageKv = substation?.voltage_kv || 33;
  const activeMw = telemetry?.active_power_mw || 24.8;

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(viewMode === 'emf' ? 0x050a18 : 0x0b1120);
    scene.fog = new THREE.FogExp2(viewMode === 'emf' ? 0x050a18 : 0x0b1120, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(22, 14, 24);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    controls.minDistance = 8;
    controls.maxDistance = 65;
    controls.target.set(0, 4, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xd8e8ff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Dynamic Status Point Light underneath transformer plinth
    const statusLight = new THREE.PointLight(statusColorHex, 2.5, 20);
    statusLight.position.set(0, 1.5, 0);
    scene.add(statusLight);

    // Blue fill light
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-20, 20, -15);
    scene.add(fillLight);

    // 6. Substation Yard Construction
    buildSubstationYard(scene, statusColorHex, oilTemp, loadPct);

    // 7. Raycasting for Hotspots
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit && !hit.userData?.hotspot && hit.parent && hit.parent !== scene) {
          hit = hit.parent;
        }
        if (hit && hit.userData?.hotspot) {
          setSelectedHotspot(hit.userData.hotspot);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // 8. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Rotate cooling fans based on load %
      const fanSpeed = (loadPct / 50) * 8;
      fansRef.current.forEach(fan => {
        fan.rotation.z += delta * fanSpeed;
      });

      // Pulse corona discharge rings
      coronaRingsRef.current.forEach((ring, idx) => {
        const pulse = 1 + Math.sin(time * 6 + idx) * 0.18;
        ring.scale.set(pulse, pulse, pulse);
      });

      // Flow current particles along overhead lines
      if (currentParticlesRef.current) {
        const positions = currentParticlesRef.current.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          let z = positions.getZ(i);
          z += delta * (loadPct > 80 ? 12 : 6);
          if (z > 14) z = -14;
          positions.setZ(i, z);
        }
        positions.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update visual mode materials when viewMode, oilTemp, or status changes
  useEffect(() => {
    if (!sceneRef.current) return;
    updateMaterialModes(viewMode, oilTemp, loadPct, statusColorHex);
  }, [viewMode, oilTemp, loadPct, status]);

  // Update controls auto-rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Procedural 3D Substation Model Construction
  const buildSubstationYard = (scene, statusColor, tempC, load) => {
    fansRef.current = [];
    coronaRingsRef.current = [];
    radiatorMeshesRef.current = [];

    // --- A. Foundation & Ground ---
    const yardGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
    const yardMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95,
      metalness: 0.1
    });
    const yard = new THREE.Mesh(yardGeo, yardMat);
    yard.rotation.x = -Math.PI / 2;
    yard.receiveShadow = true;
    scene.add(yard);

    const grid = new THREE.GridHelper(60, 40, 0x38bdf8, 0x334155);
    grid.position.y = 0.02;
    scene.add(grid);

    // Reinforced concrete transformer plinth
    const plinthGeo = new THREE.BoxGeometry(14, 0.8, 12);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.2
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.4;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    scene.add(plinth);

    // Oil catch basin containment curb
    const curbGeo = new THREE.BoxGeometry(14.6, 0.5, 12.6);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.y = 0.25;
    scene.add(curb);

    // --- B. Main Power Transformer Tank ---
    const transformerGroup = new THREE.Group();
    transformerGroup.position.set(0, 0.8, 0);
    transformerGroup.userData = {
      hotspot: {
        id: 'core',
        title: 'Primary 3-Phase Transformer Core',
        details: 'Step-down oil-immersed ONAN/ONAF mineral oil power unit.',
        oilTemp: `${tempC}°C`,
        loadRatio: `${load}%`,
        status: status,
        vibration: '0.42 mm/s (Normal)',
        gasDga: 'H2: 12ppm • CH4: 4ppm (Healthy)'
      }
    };

    // Main Tank Body
    const tankGeo = new THREE.BoxGeometry(6.5, 4.8, 5.0);
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.65,
      roughness: 0.35
    });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 2.4;
    tank.castShadow = true;
    tank.receiveShadow = true;
    coreMeshRef.current = tank;
    transformerGroup.add(tank);

    // Tank top cover lid
    const lidGeo = new THREE.BoxGeometry(6.9, 0.3, 5.4);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 4.95;
    lid.castShadow = true;
    transformerGroup.add(lid);

    // Oil Conservator Tank (Cylinder atop transformer)
    const conservatorGeo = new THREE.CylinderGeometry(0.7, 0.7, 4.5, 24);
    const conservatorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    const conservator = new THREE.Mesh(conservatorGeo, conservatorMat);
    conservator.rotation.z = Math.PI / 2;
    conservator.position.set(0, 6.2, -1.2);
    conservator.castShadow = true;
    conservator.userData = {
      hotspot: {
        id: 'conservator',
        title: 'Oil Conservator Drum & Buchholz Relay',
        details: 'Thermal expansion oil reservoir with moisture desiccant breather.',
        oilLevel: '78% Optimal',
        gasTrip: 'Armed • No Accumulation',
        status: 'NORMAL'
      }
    };
    transformerGroup.add(conservator);

    // Conservator support brackets
    const bracketGeo = new THREE.BoxGeometry(0.2, 1.3, 0.4);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const b1 = new THREE.Mesh(bracketGeo, bracketMat);
    b1.position.set(-1.4, 5.5, -1.2);
    const b2 = new THREE.Mesh(bracketGeo, bracketMat);
    b2.position.set(1.4, 5.5, -1.2);
    transformerGroup.add(b1, b2);

    // Buchholz Relay connecting pipe
    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0, 5.5, -1.2);
    transformerGroup.add(pipe);

    // Silica gel breather canister
    const breatherGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.9, 16);
    const breatherMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, transparent: true, opacity: 0.85 });
    const breather = new THREE.Mesh(breatherGeo, breatherMat);
    breather.position.set(2.4, 4.8, -1.2);
    transformerGroup.add(breather);

    // --- C. Cooling Radiator Fin Banks & Fans ---
    const buildRadiatorBank = (side) => {
      const radGroup = new THREE.Group();
      radGroup.position.set(side * 4.1, 2.4, 0);
      radGroup.userData = {
        hotspot: {
          id: `radiator_${side > 0 ? 'right' : 'left'}`,
          title: 'ONAF Forced-Air Radiator Cooling Bank',
          details: 'High-surface-area heat exchanger flutes with variable-speed draft fans.',
          fanRpm: `${Math.round(850 * (load / 70))} RPM`,
          coolingDelta: `-14.2°C Dissipation`,
          status: status
        }
      };

      const radBodyGeo = new THREE.BoxGeometry(1.2, 3.8, 4.2);
      const radBodyMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
      const radBody = new THREE.Mesh(radBodyGeo, radBodyMat);
      radBody.castShadow = true;
      radiatorMeshesRef.current.push(radBody);
      radGroup.add(radBody);

      // Radiator cooling vertical flutes
      for (let f = -1.8; f <= 1.8; f += 0.4) {
        const finGeo = new THREE.BoxGeometry(1.4, 3.6, 0.08);
        const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.z = f;
        radGroup.add(fin);
      }

      // Cooling Fans
      [-1.1, 1.1].forEach((posZ) => {
        const fanCowlGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24);
        const fanCowlMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const fanCowl = new THREE.Mesh(fanCowlGeo, fanCowlMat);
        fanCowl.rotation.z = Math.PI / 2;
        fanCowl.position.set(side * 0.75, 0, posZ);
        radGroup.add(fanCowl);

        // Fan Blades
        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(side * 0.85, 0, posZ);
        for (let b = 0; b < 4; b++) {
          const bladeGeo = new THREE.BoxGeometry(0.12, 0.45, 0.02);
          const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 });
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.rotation.x = (b * Math.PI) / 2;
          bladeGroup.add(blade);
        }
        fansRef.current.push(bladeGroup);
        radGroup.add(bladeGroup);
      });

      return radGroup;
    };

    transformerGroup.add(buildRadiatorBank(1));
    transformerGroup.add(buildRadiatorBank(-1));

    // --- D. High-Voltage Ceramic Bushings (Phases R, Y, B) ---
    const bushingPhaseColors = [0xef4444, 0xf59e0b, 0x3b82f6]; // Red, Yellow, Blue phases
    const bushingPositions = [-1.8, 0, 1.8];

    bushingPositions.forEach((x, i) => {
      const bushingGroup = new THREE.Group();
      bushingGroup.position.set(x, 5.1, 0.8);
      bushingGroup.userData = {
        hotspot: {
          id: `bushing_${i}`,
          title: `HV 33kV Porcelain Bushing (Phase ${['R', 'Y', 'B'][i]})`,
          details: 'Outdoor condenser bushing with shedding porcelain skirts and corona ring.',
          ratedKv: `${voltageKv} kV`,
          dielectricLoss: '0.003 tan δ (Safe)',
          phaseCurrent: `${Math.round((activeMw * 1000) / (1.732 * voltageKv * 0.95))} Amperes`,
          status: status
        }
      };

      // Porcelain disc shed stack (conical ribs)
      for (let s = 0; s < 5; s++) {
        const shedGeo = new THREE.CylinderGeometry(0.18 + s * 0.03, 0.28 + s * 0.03, 0.2, 16);
        const shedMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.2,
          metalness: 0.1
        });
        const shed = new THREE.Mesh(shedGeo, shedMat);
        shed.position.y = s * 0.32;
        shed.castShadow = true;
        bushingGroup.add(shed);
      }

      // Copper terminal rod
      const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 16);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.y = 1.0;
      bushingGroup.add(rod);

      // Phase identification band
      const bandGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
      const bandMat = new THREE.MeshBasicMaterial({ color: bushingPhaseColors[i] });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 2.0;
      bushingGroup.add(band);

      // Animated Corona Discharge Halo Ring
      const coronaGeo = new THREE.TorusGeometry(0.42, 0.04, 12, 24);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: viewMode === 'thermal' ? 0xff4444 : 0x00f0ff,
        transparent: true,
        opacity: 0.75
      });
      const corona = new THREE.Mesh(coronaGeo, coronaMat);
      corona.rotation.x = Math.PI / 2;
      corona.position.y = 2.15;
      coronaRingsRef.current.push(corona);
      bushingGroup.add(corona);

      transformerGroup.add(bushingGroup);
    });

    scene.add(transformerGroup);

    // --- E. Steel Lattice Gantry Towers & Transmission Line Arch ---
    const buildGantryTower = (posX) => {
      const towerGroup = new THREE.Group();
      towerGroup.position.set(posX, 0, 10);

      // 4 Main Vertical Angle Legs
      const legGeo = new THREE.BoxGeometry(0.18, 14, 0.18);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.35 });

      const offsets = [
        [-1.2, -1.2],
        [1.2, -1.2],
        [-0.8, 1.2],
        [0.8, 1.2]
      ];

      offsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(legGeo, steelMat);
        leg.position.set(ox, 7, oz);
        leg.castShadow = true;
        towerGroup.add(leg);
      });

      // Diagonal cross-bracing ties
      for (let y = 1.5; y < 13; y += 2.2) {
        const tieGeo = new THREE.BoxGeometry(2.4, 0.08, 0.08);
        const tie = new THREE.Mesh(tieGeo, steelMat);
        tie.position.set(0, y, 0);
        towerGroup.add(tie);
      }

      // Tower Top Crossarm Gantry Beam
      const crossarmGeo = new THREE.BoxGeometry(7.5, 0.6, 1.4);
      const crossarm = new THREE.Mesh(crossarmGeo, steelMat);
      crossarm.position.set(0, 13.6, 0);
      crossarm.castShadow = true;
      towerGroup.add(crossarm);

      // Hanging Suspension Insulator Strings
      [-2.4, 0, 2.4].forEach((cx) => {
        const stringGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 12);
        const stringMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1 });
        const insString = new THREE.Mesh(stringGeo, stringMat);
        insString.position.set(cx, 12.3, 0);
        towerGroup.add(insString);
      });

      return towerGroup;
    };

    scene.add(buildGantryTower(-6));
    scene.add(buildGantryTower(6));

    // Connect towers with cross bridge gantry
    const bridgeGeo = new THREE.BoxGeometry(12, 0.4, 1.2);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 13.6, 10);
    scene.add(bridge);

    // --- F. High Voltage Sagging Overhead Conductors (Lines) ---
    bushingPositions.forEach((bx) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(bx, 7.25, 0.8),
        new THREE.Vector3(bx * 1.2, 8.5, 5.5),
        new THREE.Vector3(bx * 1.3, 11.4, 10.0)
      );

      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.04, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.9,
        roughness: 0.2,
        emissive: viewMode === 'emf' ? 0x00f0ff : 0x002244
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tube);
    });

    // --- G. Current Particles Flow (Electrons / Power Flow) ---
    const particleCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      const lineIdx = p % 3;
      const bx = bushingPositions[lineIdx];
      const z = (p / particleCount) * 10;
      const y = 7.5 + (z / 10) * 4;
      particlePos[p * 3] = bx + (Math.random() - 0.5) * 0.2;
      particlePos[p * 3 + 1] = y;
      particlePos[p * 3 + 2] = z;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const currentParticles = new THREE.Points(particleGeo, particleMat);
    currentParticlesRef.current = currentParticles;
    scene.add(currentParticles);

    // --- H. SF6 Circuit Breakers on Yard Perimeter ---
    [-5.5, 5.5].forEach((bx, idx) => {
      const breakerGroup = new THREE.Group();
      breakerGroup.position.set(bx, 0.4, -6);
      breakerGroup.userData = {
        hotspot: {
          id: `breaker_${idx}`,
          title: `SF6 Live-Tank Circuit Breaker (${idx === 0 ? 'Bus-A' : 'Bus-B'})`,
          details: 'Puffer-type SF6 gas insulated interrupter unit with spring mechanism.',
          gasPressure: '6.2 Bar (Optimal)',
          interrupterState: 'CLOSED / ACTIVE',
          status: 'NORMAL'
        }
      };

      const baseGeo = new THREE.BoxGeometry(2.2, 0.4, 1.8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const bBase = new THREE.Mesh(baseGeo, baseMat);
      breakerGroup.add(bBase);

      // 3 Breaker Poles
      [-0.6, 0, 0.6].forEach(px => {
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.4, 16);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px, 1.4, 0);
        breakerGroup.add(pole);

        // Status LED Beacon on pole top
        const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const ledMat = new THREE.MeshBasicMaterial({ color: statusColor });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(px, 2.7, 0);
        breakerGroup.add(led);
      });

      scene.add(breakerGroup);
    });
  };

  // Switch materials between Physical, Thermal IR, and EMF modes
  const updateMaterialModes = (mode, tempC, load, statusColor) => {
    if (!coreMeshRef.current) return;

    if (mode === 'thermal') {
      const thermalColor = 
        tempC >= 80 ? new THREE.Color(0xef4444) : 
        tempC >= 70 ? new THREE.Color(0xf59e0b) : 
        new THREE.Color(0x10b981);

      coreMeshRef.current.material = new THREE.MeshStandardMaterial({
        color: thermalColor,
        roughness: 0.3,
        metalness: 0.4,
        emissive: thermalColor,
        emissiveIntensity: 0.55
      });

      radiatorMeshesRef.current.forEach(mesh => {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.4,
          emissive: 0xb45309,
          emissiveIntensity: 0.4
        });
      });

      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(0x0f0714);
      }
    } else if (mode === 'emf') {
      coreMeshRef.current.material = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        wireframe: true,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.8
      });

      radiatorMeshesRef.current.forEach(mesh => {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          wireframe: true,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6
        });
      });

      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(0x040817);
      }
    } else {
      coreMeshRef.current.material = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.65,
        roughness: 0.35,
        emissive: 0x000000,
        emissiveIntensity: 0.0
      });

      radiatorMeshesRef.current.forEach(mesh => {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.6,
          roughness: 0.4,
          emissive: 0x000000
        });
      });

      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(0x0b1120);
      }
    }
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(22, 14, 24);
      controlsRef.current.target.set(0, 4, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#080d1a] shadow-2xl group select-none">
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        style={{ height }}
        className="w-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none flex-wrap gap-2">
        {/* Substation Title & Status Badge */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/85 backdrop-blur-md p-1.5 px-3 rounded-xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              status === 'CRITICAL' ? 'bg-rose-500 animate-ping' :
              status === 'ELEVATED' ? 'bg-amber-500 animate-pulse' :
              'bg-emerald-500'
            }`} />
            <span className="text-xs font-black text-white tracking-tight">
              {substation?.name || 'Substation Yard Twin'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">
            {voltageKv} kV
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {activeMw} MW ({loadPct}%)
          </span>
        </div>

        {/* View Mode Switcher: Physical | Thermal IR | EMF */}
        <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-800/80 shadow-lg pointer-events-auto">
          <button
            onClick={() => setViewMode('physical')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'physical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Physical Architectural Material View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Physical</span>
          </button>

          <button
            onClick={() => setViewMode('thermal')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'thermal'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Thermal Infrared False-Color Hotspot Heatmap"
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Thermal IR</span>
          </button>

          <button
            onClick={() => setViewMode('emf')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'emf'
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Electromagnetic Field & Current Particle Flow"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>EMF Flux</span>
          </button>
        </div>
      </div>

      {/* Camera & Orbit Utility Controls */}
      <div className="absolute top-16 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-xl backdrop-blur-md border text-xs font-medium transition-all ${
            autoRotate 
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm' 
              : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title={autoRotate ? 'Pause 3D Auto-Rotation' : 'Resume 3D Auto-Rotation'}
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        </button>

        <button
          onClick={handleResetCamera}
          className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md border border-slate-800 text-slate-400 hover:text-white transition-all shadow-sm"
          title="Reset 3D Perspective"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Telemetry HUD Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between pointer-events-none gap-3">
        {/* Thermal Bar in Thermal Mode */}
        {viewMode === 'thermal' && (
          <div className="bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-amber-500/40 shadow-2xl pointer-events-auto max-w-xs">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                Live Thermal Hotspot Scan
              </span>
              <span className="font-mono font-bold text-white">{oilTemp}°C</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 mb-1.5" />
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>Cool (40°C)</span>
              <span>Nominal (65°C)</span>
              <span>Critical (85°C)</span>
            </div>
          </div>
        )}

        {/* Selected Component Inspection Overlay Card */}
        {selectedHotspot ? (
          <div className="bg-slate-950/95 backdrop-blur-xl p-4 rounded-xl border border-cyan-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.2)] pointer-events-auto max-w-sm ml-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                  3D Component Telemetry HUD
                </span>
                <h4 className="text-sm font-black text-white">
                  {selectedHotspot.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
              {selectedHotspot.details}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
              {Object.entries(selectedHotspot)
                .filter(([k]) => !['id', 'title', 'details'].includes(k))
                .map(([key, val]) => (
                  <div key={key} className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[9px] font-sans text-slate-400 uppercase block">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="font-bold text-cyan-300">{val}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 pointer-events-none hidden sm:flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click any 3D asset (Transformer Core, Radiator, Bushing) for deep sensor diagnostics.</span>
          </div>
        )}
      </div>

      {/* Subtle Hint on Canvas Drag */}
      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 pointer-events-none hidden md:block">
        Left-click: Rotate • Right-click: Pan • Scroll: Zoom
      </div>
    </div>
  );
}
