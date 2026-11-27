(() => {
  const stage = document.getElementById('carStage');
  if (!stage) return;

  const loading = document.getElementById('carLoading');
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const railCount = document.getElementById('chapterCount');
  const railName = document.getElementById('chapterName');
  const railProgress = document.getElementById('chapterProgress');
  const swatches = Array.from(document.querySelectorAll('[data-finish]'));
  const autoButton = document.getElementById('finishAuto');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FINISHES = [
    { hex: 0xd40000, label: 'Rosso' },
    { hex: 0xe4e0d5, label: 'Bone' },
    { hex: 0x3b4246, label: 'Graphite' }
  ];

  // ── Story & Scroll State ────────────────────────────────────────────────────
  const storyState = {
    progress: 0,
    chapterFloat: 0,
    targetX: 2.45,
    velocity: 0,
    smoothVelocity: 0
  };
  const finishState = { mode: 'auto', manual: 0 };

  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
  const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

  function updateFinishUI() {
    const active = finishState.mode === 'auto' ? 'auto' : String(finishState.manual);
    swatches.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.finish === active)));
    if (autoButton) autoButton.setAttribute('aria-pressed', String(finishState.mode === 'auto'));
  }

  swatches.forEach(btn => {
    btn.addEventListener('click', () => {
      finishState.mode = 'manual';
      finishState.manual = Number(btn.dataset.finish);
      updateFinishUI();
    });
  });
  if (autoButton) {
    autoButton.addEventListener('click', () => {
      finishState.mode = 'auto';
      updateFinishUI();
    });
  }
  updateFinishUI();

  const sides = chapters.map(c => c.dataset.side === 'left' ? -2.45 : 2.45);
  let lastScrollY = window.scrollY;

  // ── High Performance Cached Chapter Metrics (Zero Reflow on Scroll) ────────
  let cachedCenters = [];
  function measureChapters() {
    const scrollY = window.scrollY;
    cachedCenters = chapters.map(chapter => {
      const layout = chapter.parentElement?.classList.contains('pin-spacer')
        ? chapter.parentElement : chapter;
      const rect = layout.getBoundingClientRect();
      return rect.top + scrollY + rect.height * 0.5;
    });
  }
  measureChapters();
  window.addEventListener('resize', measureChapters);
  if (window.ScrollTrigger) {
    ScrollTrigger.addEventListener('refresh', measureChapters);
  }

  function updateStory() {
    if (!chapters.length) return;
    const scrollY = window.scrollY;
    const rawDy = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    storyState.velocity = storyState.velocity * 0.78 + rawDy * 0.22;

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    storyState.progress = clamp(scrollY / maxScroll, 0, 1);

    if (!cachedCenters.length) measureChapters();

    const focus = scrollY + window.innerHeight * 0.58;
    let index = 0;
    while (index < cachedCenters.length - 2 && focus > cachedCenters[index + 1]) index++;
    const span = Math.max(1, cachedCenters[index + 1] - cachedCenters[index]);
    const t = clamp((focus - cachedCenters[index]) / span, 0, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    storyState.chapterFloat = index + eased;
    storyState.targetX = sides[index] + (sides[Math.min(index + 1, sides.length - 1)] - sides[index]) * eased;

    if (railCount && railName && railProgress) {
      const active = clamp(Math.round(storyState.chapterFloat), 0, chapters.length - 1);
      railCount.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(chapters.length).padStart(2, '0');
      railName.textContent = chapters[active].dataset.chapter || '';
      railProgress.style.transform = 'scaleX(' + storyState.progress.toFixed(4) + ')';
    }
  }

  // RAF throttled scroll listener - eliminates frame hitching
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateStory();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'max',
      onRefresh: () => { measureChapters(); updateStory(); }
    });
  }
  updateStory();

  // ── WebGL Check ─────────────────────────────────────────────────────────────
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch { return false; }
  }
  if (!hasWebGL()) {
    if (loading) loading.classList.add('is-done');
    return;
  }

  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  if (!document.querySelector('script[type="importmap"]')) {
    const importMap = document.createElement('script');
    importMap.type = 'importmap';
    importMap.textContent = JSON.stringify({
      imports: { 'three': './assets/vendor/three.module.min.js', 'three/addons/': './assets/vendor/addons/' }
    });
    document.head.appendChild(importMap);
  }

  Promise.all([
    import('/assets/vendor/three.module.min.js'),
    import('/assets/vendor/addons/loaders/GLTFLoader.js'),
    import('/assets/vendor/addons/loaders/DRACOLoader.js')
  ]).then(([THREE, gltfMod, dracoMod]) => {
    init(THREE, gltfMod.GLTFLoader, dracoMod.DRACOLoader);
  }).catch((err) => {
    console.error('Three.js import error:', err);
    if (loading) loading.classList.add('is-done');
  });

  function init(THREE, GLTFLoader, DRACOLoader) {
    stage.classList.add('is-live');

    // ── Renderer Configuration — Fast & Clean ─────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPower,
      alpha: true,
      powerPreference: 'high-performance'
    });
    // Cap DPR at 1.35 to prevent high-DPI fillrate lag while maintaining retina sharpness
    const maxDPR = lowPower || window.innerWidth < 700 ? 1.0 : 1.35;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDPR));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !lowPower && !reduceMotion;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // ── High-Contrast Studio Environment ─────────────────────────────────────
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x040506);

    function addPanel(color, w, h, x, y, z, rx, ry) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, 0);
      envScene.add(m);
    }
    addPanel(0xffffff, 14, 2.4, 0, 9.5, 0, Math.PI / 2, 0);
    addPanel(0xc8daff, 4.2, 9, -9, 3.5, 0, 0, Math.PI / 2);
    addPanel(0xffe8c0, 5.2, 7.5, 9, 3, 1, 0, -Math.PI / 2);
    addPanel(0xe8ecf0, 7, 3.2, 0, 3.5, -8, 0, 0);
    addPanel(0xe6a230, 2.2, 6.5, 0, 3, 8, 0, Math.PI);
    addPanel(0x0a0c0e, 14, 14, 0, -1, 0, Math.PI / 2, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();

    // ── Floor & Grid ──────────────────────────────────────────────────────────
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x05080a,
      metalness: 0.88,
      roughness: 0.28,
      envMapIntensity: 0.65
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.19;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(50, 50, 0x151c20, 0x0d1215);
    grid.position.y = -0.185;
    grid.material.transparent = true;
    grid.material.opacity = 0.14;
    scene.add(grid);

    // ── Lights ────────────────────────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight(0xb8cce0, 0x060809, 0.28);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff2e0, 2.6);
    key.position.set(-5, 8, 7);
    key.castShadow = !lowPower && !reduceMotion;
    if (key.castShadow) {
      key.shadow.mapSize.set(1024, 1024); // 1024 is optimized for performance & quality
      key.shadow.bias = -0.0003;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 28;
      key.shadow.camera.left = -5;
      key.shadow.camera.right = 5;
      key.shadow.camera.top = 5;
      key.shadow.camera.bottom = -5;
    }
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xaac8ff, 1.6);
    rim.position.set(6, 4, -6);
    scene.add(rim);

    // ── Showroom Root ─────────────────────────────────────────────────────────
    const showroomRoot = new THREE.Group();
    scene.add(showroomRoot);

    const spot = new THREE.SpotLight(0xfff4e8, 90, 26, 0.38, 0.72, 1.6);
    spot.position.set(0, 8.2, 0.6);
    spot.castShadow = renderer.shadowMap.enabled;
    if (spot.castShadow) {
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0003;
      spot.shadow.camera.near = 0.4;
      spot.shadow.camera.far = 26;
    }
    showroomRoot.add(spot);
    showroomRoot.add(spot.target);
    spot.target.position.set(0, 0, 0.3);

    // Subtle volumetric spotlight beam
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 32;
    beamCanvas.height = 256;
    const bCtx = beamCanvas.getContext('2d');
    const bGrad = bCtx.createLinearGradient(0, 0, 0, 256);
    bGrad.addColorStop(0, 'rgba(255,248,232,0.52)');
    bGrad.addColorStop(0.3, 'rgba(255,244,218,0.12)');
    bGrad.addColorStop(1, 'rgba(255,242,212,0)');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 32, 256);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 2.9, 7.8, 48, 1, true),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(beamCanvas),
        color: 0xffe8c0,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    beam.position.y = 4.1;
    showroomRoot.add(beam);

    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x0e1114, metalness: 0.95, roughness: 0.22 })
    );
    housing.position.y = 8.28;
    showroomRoot.add(housing);

    // ── Turntable ─────────────────────────────────────────────────────────────
    const turntable = new THREE.Group();
    turntable.rotation.y = Math.PI * 0.72;
    showroomRoot.add(turntable);

    const platformMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e1215,
      metalness: 0.97,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.4
    });
    const topMat = new THREE.MeshPhysicalMaterial({
      color: 0x14191d,
      metalness: 0.94,
      roughness: 0.14,
      clearcoat: 1,
      envMapIntensity: 1.5
    });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.48, 0.2, 96), platformMat);
    platform.position.y = -0.11;
    platform.receiveShadow = true;
    turntable.add(platform);
    const platformTop = new THREE.Mesh(new THREE.CylinderGeometry(3.08, 3.08, 0.016, 96), topMat);
    platformTop.position.y = 0.004;
    platformTop.receiveShadow = true;
    turntable.add(platformTop);

    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xe6a230, transparent: true, opacity: 0.62 });
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x8e9499, transparent: true, opacity: 0.14 });
    [[3.18, 0.016, outerRingMat], [2.56, 0.008, innerRingMat]].forEach(([r, t, mat]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 96), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      turntable.add(ring);
    });

    // ── Instanced Ticks (1 Draw Call instead of 72) ───────────────────────────
    const tickGeo = new THREE.BoxGeometry(0.014, 0.006, 0.14);
    const normalTicks = new THREE.InstancedMesh(tickGeo, new THREE.MeshBasicMaterial({ color: 0x6e7478, transparent: true, opacity: 0.28 }), 60);
    const accentTicks = new THREE.InstancedMesh(tickGeo, new THREE.MeshBasicMaterial({ color: 0xe6a230, transparent: true, opacity: 0.72 }), 12);
    const dummy = new THREE.Object3D();
    let nIdx = 0, aIdx = 0;
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const isAccent = i % 6 === 0;
      dummy.position.set(Math.cos(angle) * 3.22, 0.022, Math.sin(angle) * 3.22);
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.set(1, 1, isAccent ? 1.8 : 1);
      dummy.updateMatrix();
      if (isAccent) {
        accentTicks.setMatrixAt(aIdx++, dummy.matrix);
      } else {
        normalTicks.setMatrixAt(nIdx++, dummy.matrix);
      }
    }
    normalTicks.instanceMatrix.needsUpdate = true;
    accentTicks.instanceMatrix.needsUpdate = true;
    turntable.add(normalTicks);
    turntable.add(accentTicks);

    // ── Car Materials ─────────────────────────────────────────────────────────
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: FINISHES[0].hex,
      metalness: 1,
      roughness: 0.19,
      clearcoat: 1,
      clearcoatRoughness: 0.018,
      envMapIntensity: 1.5,
      reflectivity: 1
    });
    const detailsMaterial = new THREE.MeshStandardMaterial({
      color: 0xcdd3d8,
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: 1.3
    });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8aadb5,
      metalness: 0.3,
      roughness: 0.06,
      transparent: true,
      opacity: 0.52,
      clearcoat: 1,
      envMapIntensity: 1.8,
      ior: 1.5
    });

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 140);
    let baseCameraY = 2.1;
    let baseCameraZ = 11.2;
    const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
    let dragging = false;
    let dragVelocityX = 0;
    let lastPointerX = 0;
    let ready = false;
    let lastSwatch = -1;
    const intro = { v: reduceMotion ? 1 : 0 };

    const cameraTarget = new THREE.Vector3(0, 0.55, 0);
    const smoothCameraTarget = new THREE.Vector3(0, 0.55, 0);

    // ── GLTF Model Load ───────────────────────────────────────────────────────
    const draco = new DRACOLoader();
    draco.setDecoderPath('/assets/vendor/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);

    gltfLoader.load(
      '/assets/models/ferrari.glb',
      gltf => {
        const car = gltf.scene.children[0] || gltf.scene;
        const body = car.getObjectByName('body');
        if (body) body.material = bodyMaterial;
        ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach(name => {
          const part = car.getObjectByName(name);
          if (part) part.material = detailsMaterial;
        });
        const glass = car.getObjectByName('glass');
        if (glass) glass.material = glassMaterial;
        car.traverse(obj => {
          if (obj.isMesh) {
            obj.castShadow = renderer.shadowMap.enabled;
            obj.receiveShadow = renderer.shadowMap.enabled;
          }
        });

        const shadowMap = new THREE.TextureLoader().load('/assets/models/ferrari_ao.png');
        shadowMap.colorSpace = THREE.SRGBColorSpace;
        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.655 * 4.2, 1.3 * 4.2),
          new THREE.MeshBasicMaterial({
            map: shadowMap,
            blending: THREE.MultiplyBlending,
            toneMapped: false,
            transparent: true,
            premultipliedAlpha: true,
            depthWrite: false
          })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.renderOrder = 2;
        car.add(shadowPlane);

        car.scale.setScalar(0.84);
        turntable.add(car);
        ready = true;
        if (loading) loading.classList.add('is-done');

        if (window.gsap && !reduceMotion) {
          showroomRoot.position.y = -3.2;
          renderer.toneMappingExposure = 0.0;
          gsap.timeline({ delay: 0.08 })
            .to(showroomRoot.position, { y: 0, duration: 2.2, ease: 'expo.out' })
            .to(renderer, { toneMappingExposure: 1.08, duration: 2.6, ease: 'power2.inOut' }, '<0.1')
            .to(intro, { v: 1, duration: 2.0, ease: 'expo.out' }, '<');
        }
      },
      event => {
        if (loading && event.total) {
          const pct = clamp((event.loaded / event.total) * 100, 4, 100);
          const bar = loading.querySelector('i');
          if (bar) bar.style.transform = 'scaleX(' + (pct / 100).toFixed(3) + ')';
        }
      },
      () => { if (loading) loading.classList.add('is-done'); }
    );

    // ── Pointer / Drag Events ─────────────────────────────────────────────────
    stage.addEventListener('pointerdown', e => {
      dragging = true;
      lastPointerX = e.clientX;
      dragVelocityX = 0;
      stage.classList.add('is-dragging');
      if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!dragging) return;
      const dx = e.clientX - lastPointerX;
      dragVelocityX = dx * 0.006;
      turntable.rotation.y += dragVelocityX;
      lastPointerX = e.clientX;
    });
    const stopDrag = () => { dragging = false; stage.classList.remove('is-dragging'); };
    stage.addEventListener('pointerup', stopDrag);
    stage.addEventListener('pointercancel', stopDrag);
    stage.addEventListener('pointerleave', stopDrag);

    // ── Responsive Resize ─────────────────────────────────────────────────────
    function resize() {
      const W = window.innerWidth || 1;
      const H = window.innerHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      const mobile = W < 700;
      camera.fov = mobile ? 44 : 32;
      baseCameraY = mobile ? 2.7 : 2.1;
      baseCameraZ = mobile ? 13.0 : 11.2;
      camera.updateProjectionMatrix();
      measureChapters();
      updateStory();
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Lighting Temperature Story ────────────────────────────────────────────
    const lightStops = [
      new THREE.Color(0xfff4e0),
      new THREE.Color(0xe8f0ff),
      new THREE.Color(0xffe2a0),
      new THREE.Color(0xd0e8ff),
      new THREE.Color(0xfff4d0),
      new THREE.Color(0xffecc8),
      new THREE.Color(0xfff4e0)
    ];
    const finishStops = [
      new THREE.Color(FINISHES[0].hex),
      new THREE.Color(FINISHES[1].hex),
      new THREE.Color(FINISHES[2].hex),
      new THREE.Color(FINISHES[1].hex),
      new THREE.Color(FINISHES[0].hex),
      new THREE.Color(FINISHES[1].hex),
      new THREE.Color(FINISHES[0].hex)
    ];
    const tempColour = new THREE.Color();
    const tempLight = new THREE.Color();

    function sample(stops, t, target) {
      const max = stops.length - 1;
      const i = clamp(Math.floor(t), 0, max - 1);
      const f = clamp(t - i, 0, 1);
      const s = f * f * (3 - 2 * f);
      return target.copy(stops[i]).lerp(stops[i + 1], s);
    }

    let lastTime = performance.now();
    let currentX = storyState.targetX;
    const BASE_ROTATION_SPEED = 0.055;

    // ── Render Loop ───────────────────────────────────────────────────────────
    function render(now) {
      requestAnimationFrame(render);
      if (!ready || document.hidden) {
        lastTime = now;
        return;
      }

      const dt = clamp((now - lastTime) / 1000, 0, 0.05);
      lastTime = now;
      const mobile = window.innerWidth < 700;
      const storyT = storyState.chapterFloat;

      const targetX = storyState.targetX * (mobile ? 0.18 : 1);
      currentX = damp(currentX, targetX, 3.5, dt);

      showroomRoot.scale.setScalar((mobile ? 0.52 : 0.82) * (reduceMotion ? 1 : (0.86 + intro.v * 0.14)));
      showroomRoot.position.x = mobile ? currentX * 0.18 : currentX;

      if (!reduceMotion && !dragging) {
        const scrollImpulse = Math.min(storyState.smoothVelocity * 0.00008, 0.012);
        storyState.smoothVelocity = damp(storyState.smoothVelocity, storyState.velocity, 4, dt);
        turntable.rotation.y += (BASE_ROTATION_SPEED + scrollImpulse) * dt;
        dragVelocityX *= Math.pow(0.88, dt * 60);
        turntable.rotation.y += dragVelocityX;
      } else if (!reduceMotion && dragging) {
        dragVelocityX *= Math.pow(0.88, dt * 60);
      }
      storyState.velocity = damp(storyState.velocity, 0, 2.5, dt);

      if (finishState.mode === 'auto') {
        sample(finishStops, storyT, tempColour);
        bodyMaterial.color.copy(tempColour);
        const nearest = clamp(Math.round(storyT), 0, 6);
        const fi = [0, 1, 2, 1, 0, 1, 0][nearest];
        if (fi !== lastSwatch) {
          lastSwatch = fi;
          swatches.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.finish) === fi)));
          if (autoButton) autoButton.setAttribute('aria-pressed', 'true');
        }
      } else {
        bodyMaterial.color.setHex(FINISHES[finishState.manual].hex);
      }

      sample(lightStops, storyT, tempLight);
      spot.color.copy(tempLight);
      key.color.copy(tempLight);
      beam.material.color.copy(tempLight);

      const rimBlue = clamp((storyT - 2.2) / 1.2, 0, 1) * clamp(1 - (storyT - 3.8) / 1.2, 0, 1);
      rim.color.setRGB(0.68 - rimBlue * 0.47, 0.78 + rimBlue * 0.09, 1.0);

      pointer.smoothX = damp(pointer.smoothX, pointer.x, 5, dt);
      pointer.smoothY = damp(pointer.smoothY, pointer.y, 5, dt);

      camera.position.x = pointer.smoothX * (mobile ? 0.06 : 0.22);
      const floatY = Math.sin(now * 0.00014) * 0.03 + Math.sin(now * 0.00031) * 0.012;
      camera.position.y = baseCameraY + pointer.smoothY * 0.12 + floatY;
      camera.position.z = baseCameraZ;

      smoothCameraTarget.x = damp(smoothCameraTarget.x, cameraTarget.x + pointer.smoothX * 0.04, 4, dt);
      smoothCameraTarget.y = damp(smoothCameraTarget.y, cameraTarget.y - pointer.smoothY * 0.06, 4, dt);
      camera.lookAt(smoothCameraTarget);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(render);
  }
})();
