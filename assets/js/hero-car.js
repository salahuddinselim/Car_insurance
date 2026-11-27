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

  // ── story / scroll state ────────────────────────────────────────────────────
  const storyState = {
    progress: 0,
    chapterFloat: 0,
    targetX: 2.45,
    velocity: 0,
    smoothVelocity: 0
  };
  const finishState = { mode: 'auto', manual: 0 };

  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
  // Smooth exponential lerp — frame-rate independent
  const damp = (a, b, lambda, dt) => {
    const t = 1 - Math.exp(-lambda * dt);
    return a + (b - a) * t;
  };

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
  if (autoButton) autoButton.addEventListener('click', () => { finishState.mode = 'auto'; updateFinishUI(); });
  updateFinishUI();

  const sides = chapters.map(c => c.dataset.side === 'left' ? -2.45 : 2.45);
  let lastScrollY = window.scrollY;
  let settleTimer = 0;

  function settleStory() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(updateStory, 120);
  }

  function updateStory() {
    if (!chapters.length) return;
    const scrollY = window.scrollY;
    const rawDy = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    storyState.velocity = storyState.velocity * 0.78 + rawDy * 0.22;

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    storyState.progress = clamp(scrollY / maxScroll, 0, 1);

    const centers = chapters.map(chapter => {
      const layout = chapter.parentElement?.classList.contains('pin-spacer')
        ? chapter.parentElement : chapter;
      const rect = layout.getBoundingClientRect();
      return rect.top + scrollY + rect.height / 2;
    });

    const focus = scrollY + window.innerHeight * 0.58;
    let index = 0;
    while (index < centers.length - 2 && focus > centers[index + 1]) index++;
    const span = Math.max(1, centers[index + 1] - centers[index]);
    const t = clamp((focus - centers[index]) / span, 0, 1);
    // Cubic ease-in-out for chapter transitions — smooth, not snappy
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

  window.addEventListener('scroll', () => { updateStory(); settleStory(); }, { passive: true });
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({ trigger: document.body, start: 'top top', end: 'max', onUpdate: settleStory, onRefresh: updateStory });
  }
  window.addEventListener('resize', updateStory);
  updateStory();

  // ── WebGL check ─────────────────────────────────────────────────────────────
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch { return false; }
  }
  if (!hasWebGL()) { if (loading) loading.classList.add('is-done'); return; }

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
    console.error('Three.js import failed:', err);
    if (loading) loading.classList.add('is-done');
  });

  function init(THREE, GLTFLoader, DRACOLoader) {
    stage.classList.add('is-live');

    // ── Renderer — premium quality settings ───────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPower,
      alpha: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACESFilmic gives dramatic cinematic contrast — not flat
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;   // slightly under-exposed → richer blacks
    renderer.shadowMap.enabled = !lowPower && !reduceMotion;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // ── Environment — high-contrast studio panels (not cartoonish room) ───────
    // We build a minimal PMREM from scratch: one soft top-light, one warm key,
    // one cool fill. This gives the car physically-correct reflections.
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
    // Ceiling — large soft white bounce
    addPanel(0xffffff, 14, 2.4,  0, 9.5, 0,  Math.PI / 2, 0);
    // Left side — cool blue fill (simulates sky/window)
    addPanel(0xc8daff, 4.2, 9, -9, 3.5, 0,  0, Math.PI / 2);
    // Right side — warm amber key (signature showroom)
    addPanel(0xffe8c0, 5.2, 7.5, 9, 3,   1, 0, -Math.PI / 2);
    // Back wall — neutral grey
    addPanel(0xe8ecf0, 7, 3.2, 0, 3.5, -8, 0, 0);
    // Front accent — amber hotspot (reflects in bodywork)
    addPanel(0xe6a230, 2.2, 6.5, 0, 3,   8, 0, Math.PI);
    // Floor bounce
    addPanel(0x0a0c0e, 14, 14, 0, -1, 0, Math.PI / 2, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();

    // ── Floor — reflective dark stage ─────────────────────────────────────────
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x05080a,
      metalness: 0.88,
      roughness: 0.28,
      envMapIntensity: 0.65
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.19;
    floor.receiveShadow = true;
    scene.add(floor);

    // Very faint grid — barely visible, premium feel not toy feel
    const grid = new THREE.GridHelper(60, 60, 0x151c20, 0x0d1215);
    grid.position.y = -0.185;
    grid.material.transparent = true;
    grid.material.opacity = 0.14;
    scene.add(grid);

    // ── Lights ────────────────────────────────────────────────────────────────
    // Hemisphere — very dim, just fills absolute shadow areas
    const hemi = new THREE.HemisphereLight(0xb8cce0, 0x060809, 0.28);
    scene.add(hemi);

    // Key light — warm, slightly off-axis for drama
    const key = new THREE.DirectionalLight(0xfff2e0, 2.6);
    key.position.set(-5, 8, 7);
    key.castShadow = !lowPower && !reduceMotion;
    if (key.castShadow) {
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0003;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 28;
      key.shadow.camera.left = -6;
      key.shadow.camera.right = 6;
      key.shadow.camera.top = 6;
      key.shadow.camera.bottom = -6;
    }
    scene.add(key);

    // Rim / kicker — cool blue opposite key — gives depth to the silhouette
    const rim = new THREE.DirectionalLight(0xaac8ff, 1.6);
    rim.position.set(6, 4, -6);
    scene.add(rim);

    // Ground bounce — subtle warm reflection from "floor"
    const bounce = new THREE.PointLight(0xffa040, 0.4, 8, 2);
    bounce.position.set(0, -0.5, 2);
    scene.add(bounce);

    // ── Showroom root (follows scroll) ────────────────────────────────────────
    const showroomRoot = new THREE.Group();
    scene.add(showroomRoot);

    // ── Spot light + volumetric beam ──────────────────────────────────────────
    const spot = new THREE.SpotLight(0xfff4e8, 90, 26, 0.38, 0.72, 1.6);
    spot.position.set(0, 8.2, 0.6);
    spot.castShadow = renderer.shadowMap.enabled;
    if (spot.castShadow) {
      spot.shadow.mapSize.set(2048, 2048);
      spot.shadow.bias = -0.0003;
      spot.shadow.camera.near = 0.4;
      spot.shadow.camera.far = 26;
    }
    showroomRoot.add(spot);
    showroomRoot.add(spot.target);
    spot.target.position.set(0, 0, 0.3);

    // Volumetric beam — subtle, not neon
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 64;
    beamCanvas.height = 512;
    const bCtx = beamCanvas.getContext('2d');
    const bGrad = bCtx.createLinearGradient(0, 0, 0, 512);
    bGrad.addColorStop(0,    'rgba(255,248,232,0.52)');
    bGrad.addColorStop(0.28, 'rgba(255,244,218,0.14)');
    bGrad.addColorStop(0.65, 'rgba(255,242,212,0.04)');
    bGrad.addColorStop(1,    'rgba(255,242,212,0)');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 64, 512);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 2.9, 7.8, 64, 1, true),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(beamCanvas),
        color: 0xffe8c0,
        transparent: true,
        opacity: 0.11,          // subtle — not a disco spotlight
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    beam.position.y = 4.1;
    showroomRoot.add(beam);

    // Light housing (ceiling fitting detail)
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.28, 48),
      new THREE.MeshStandardMaterial({ color: 0x0e1114, metalness: 0.95, roughness: 0.22 })
    );
    housing.position.y = 8.28;
    showroomRoot.add(housing);
    const housingRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.022, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe4b8 })
    );
    housingRing.rotation.x = Math.PI / 2;
    housingRing.position.y = 8.12;
    showroomRoot.add(housingRing);

    // ── Turntable ─────────────────────────────────────────────────────────────
    const turntable = new THREE.Group();
    turntable.rotation.y = Math.PI * 0.72; // start at a dramatic 3/4 angle
    showroomRoot.add(turntable);

    // Platform — high-gloss dark metal, not a cheap white circle
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
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.48, 0.2, 128), platformMat);
    platform.position.y = -0.11;
    platform.receiveShadow = true;
    turntable.add(platform);
    const platformTop = new THREE.Mesh(new THREE.CylinderGeometry(3.08, 3.08, 0.016, 128), topMat);
    platformTop.position.y = 0.004;
    platformTop.receiveShadow = true;
    turntable.add(platformTop);

    // Edge rings — amber outer only, inner rings very faint
    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xe6a230, transparent: true, opacity: 0.62 });
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x8e9499, transparent: true, opacity: 0.14 });
    [[3.18, 0.016, outerRingMat], [2.56, 0.008, innerRingMat], [1.78, 0.008, innerRingMat]].forEach(([r, t, mat]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 160), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      turntable.add(ring);
    });

    // Tick marks — precision instrument feel
    const tickGeo = new THREE.BoxGeometry(0.014, 0.006, 0.14);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x6e7478, transparent: true, opacity: 0.28 });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0xe6a230, transparent: true, opacity: 0.72 });
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const accent = i % 6 === 0;
      const tick = new THREE.Mesh(tickGeo, accent ? accentMat : tickMat);
      tick.position.set(Math.cos(angle) * 3.22, 0.022, Math.sin(angle) * 3.22);
      tick.rotation.y = -angle;
      if (accent) tick.scale.z = 1.9;
      turntable.add(tick);
    }

    // ── Car materials — physically correct ────────────────────────────────────
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: FINISHES[0].hex,
      metalness: 1,
      roughness: 0.19,          // very smooth — catches light precisely
      clearcoat: 1,
      clearcoatRoughness: 0.018, // near-mirror clearcoat
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
      ior: 1.5             // physically correct glass IOR
    });

    // ── Camera setup ──────────────────────────────────────────────────────────
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

    // Smooth camera target — always looks slightly above platform centre
    const cameraTarget = new THREE.Vector3(0, 0.55, 0);
    const smoothCameraTarget = new THREE.Vector3(0, 0.55, 0);

    // ── GLTF loader ───────────────────────────────────────────────────────────
    const draco = new DRACOLoader();
    draco.setDecoderPath('assets/vendor/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);

    gltfLoader.load(
      'assets/models/ferrari.glb',
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

        // Contact shadow / AO plane
        const shadowMap = new THREE.TextureLoader().load('assets/models/ferrari_ao.png');
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

        // Premium intro: car rises from below + exposure blooms in
        if (window.gsap && !reduceMotion) {
          // showroomRoot starts below the floor, rises up
          showroomRoot.position.y = -3.5;
          renderer.toneMappingExposure = 0.0;
          gsap.timeline({ delay: 0.08 })
            .to(showroomRoot.position, {
              y: 0,
              duration: 2.4,
              ease: 'expo.out'
            })
            .to(renderer, {
              toneMappingExposure: 1.08,
              duration: 2.8,
              ease: 'power2.inOut'
            }, '<0.1')
            .to(intro, {
              v: 1,
              duration: 2.2,
              ease: 'expo.out'
            }, '<');
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

    // ── Pointer / drag ────────────────────────────────────────────────────────
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

    // ── Resize ────────────────────────────────────────────────────────────────
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
      updateStory();
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Chapter light colour story ────────────────────────────────────────────
    // Each chapter gets a distinct light temperature — creates mood shift
    const lightStops = [
      new THREE.Color(0xfff4e0), // 0 Arrival      — warm golden hour
      new THREE.Color(0xe8f0ff), // 1 Workshop      — cool daylight
      new THREE.Color(0xffe2a0), // 2 Craft         — forge warmth
      new THREE.Color(0xd0e8ff), // 3 Precision     — clinical blue
      new THREE.Color(0xfff4d0), // 4 Finish        — gallery warm
      new THREE.Color(0xffecc8), // 5 Insurance     — evening amber
      new THREE.Color(0xfff4e0)  // 6 Contact       — back to warm
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
      // Smooth-step the interpolation so colour transitions aren't linear/harsh
      const s = f * f * (3 - 2 * f);
      return target.copy(stops[i]).lerp(stops[i + 1], s);
    }

    // ── State for smooth render ────────────────────────────────────────────────
    let lastTime = performance.now();
    let currentX = storyState.targetX;   // smoothed car X position
    let currentRotY = turntable.rotation.y;
    // Idle rotation: very slow, almost imperceptible — like a real turntable
    const BASE_ROTATION_SPEED = 0.055; // rad/s — real showroom turntables: ~1 RPM ≈ 0.105 rad/s

    // ── Render loop ───────────────────────────────────────────────────────────
    function render(now) {
      requestAnimationFrame(render);
      if (!ready || document.hidden) { lastTime = now; return; }

      const dt = clamp((now - lastTime) / 1000, 0, 0.05);
      lastTime = now;
      const mobile = window.innerWidth < 700;
      const storyT = storyState.chapterFloat;

      // ── Car X position — damped, not linear lerp ──────────────────────────
      const targetX = storyState.targetX * (mobile ? 0.18 : 1);
      // lambda = 3.5 → settles in ~0.8s — feels weighted not snappy
      currentX = damp(currentX, targetX, 3.5, dt);

      showroomRoot.scale.setScalar((mobile ? 0.52 : 0.82) * (reduceMotion ? 1 : (0.86 + intro.v * 0.14)));
      showroomRoot.position.x = mobile ? currentX * 0.18 : currentX;
      if (!ready) showroomRoot.position.y = -3.5; // before model loads

      // ── Turntable rotation — physics: inertia + drag momentum ───────────
      if (!reduceMotion && !dragging) {
        // Scroll velocity adds a tiny impulse — but heavily capped and quickly
        // dissipated so it doesn't feel cartoonish
        const scrollImpulse = Math.min(storyState.smoothVelocity * 0.00008, 0.012);
        storyState.smoothVelocity = damp(storyState.smoothVelocity, storyState.velocity, 4, dt);
        turntable.rotation.y += (BASE_ROTATION_SPEED + scrollImpulse) * dt;
        // Drag inertia — coasts to a stop naturally
        dragVelocityX *= Math.pow(0.88, dt * 60);
        turntable.rotation.y += dragVelocityX;
      } else if (!reduceMotion && dragging) {
        // While dragging: drag velocity applied in event handler
        dragVelocityX *= Math.pow(0.88, dt * 60);
      }
      storyState.velocity = damp(storyState.velocity, 0, 2.5, dt);

      // ── Paint / body colour ───────────────────────────────────────────────
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

      // ── Dynamic lighting — shifts with chapter mood ───────────────────────
      sample(lightStops, storyT, tempLight);
      // Spot and key lights shift colour temperature with the chapter
      spot.color.copy(tempLight);
      key.color.copy(tempLight);
      beam.material.color.copy(tempLight);
      // Rim goes from amber warm to cool blue in the precision chapter
      const rimBlue = clamp((storyT - 2.2) / 1.2, 0, 1) * clamp(1 - (storyT - 3.8) / 1.2, 0, 1);
      rim.color.setRGB(
        0.68 - rimBlue * 0.47,  // R
        0.78 + rimBlue * 0.09,  // G
        1.0  + rimBlue * 0.0    // B  — cool blue spike in precision chapter
      );

      // Exposure breathes very slightly with scroll — cinematic not distracting
      if (!reduceMotion && intro.v > 0.98) {
        const breathe = 1.08 + Math.sin(now * 0.00011) * 0.012;
        renderer.toneMappingExposure = damp(renderer.toneMappingExposure, breathe, 0.6, dt);
      }

      // ── Camera — smooth parallax with pointer, gentle float ───────────────
      pointer.smoothX = damp(pointer.smoothX, pointer.x, 5, dt);
      pointer.smoothY = damp(pointer.smoothY, pointer.y, 5, dt);

      // Very subtle mouse parallax — feels alive not gimmicky
      camera.position.x = pointer.smoothX * (mobile ? 0.06 : 0.22);
      // Gentle float + pointer response
      const floatY = Math.sin(now * 0.00014) * 0.03 + Math.sin(now * 0.00031) * 0.012;
      camera.position.y = baseCameraY + pointer.smoothY * 0.12 + floatY;
      camera.position.z = baseCameraZ;

      // Camera looks at a smoothed target — avoids jerky snap
      smoothCameraTarget.x = damp(smoothCameraTarget.x, cameraTarget.x + pointer.smoothX * 0.04, 4, dt);
      smoothCameraTarget.y = damp(smoothCameraTarget.y, cameraTarget.y - pointer.smoothY * 0.06, 4, dt);
      camera.lookAt(smoothCameraTarget);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(render);
  }
})();
