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

  const storyState = {
    progress: 0,
    chapterFloat: 0,
    targetX: 2.45,
    velocity: 0
  };
  const finishState = { mode: 'auto', manual: 0 };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function updateFinishUI() {
    const active = finishState.mode === 'auto' ? 'auto' : String(finishState.manual);
    swatches.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.finish === active));
    });
    if (autoButton) autoButton.setAttribute('aria-pressed', String(finishState.mode === 'auto'));
  }

  swatches.forEach(button => {
    button.addEventListener('click', () => {
      finishState.mode = 'manual';
      finishState.manual = Number(button.dataset.finish);
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

  const sides = chapters.map(chapter => chapter.dataset.side === 'left' ? -2.45 : 2.45);
  let lastScrollY = window.scrollY;
  let settleTimer = 0;

  function settleStory() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(updateStory, 140);
  }

  function updateStory() {
    if (!chapters.length) return;

    const scrollY = window.scrollY;
    const dy = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    storyState.velocity = lerp(storyState.velocity, dy, 0.25);

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    storyState.progress = clamp(scrollY / maxScroll, 0, 1);

    const centers = chapters.map(chapter => {
      const layout = chapter.parentElement && chapter.parentElement.classList.contains('pin-spacer')
        ? chapter.parentElement
        : chapter;
      const rect = layout.getBoundingClientRect();
      return rect.top + scrollY + rect.height / 2;
    });
    const focus = scrollY + window.innerHeight * 0.6;
    let index = 0;
    while (index < centers.length - 2 && focus > centers[index + 1]) index++;
    const span = Math.max(1, centers[index + 1] - centers[index]);
    const t = clamp((focus - centers[index]) / span, 0, 1);
    const eased = t * t * (3 - 2 * t);

    storyState.chapterFloat = index + eased;
    storyState.targetX = lerp(sides[index], sides[index + 1], eased);

    if (railCount && railName && railProgress) {
      const active = clamp(Math.round(storyState.chapterFloat), 0, chapters.length - 1);
      railCount.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(chapters.length).padStart(2, '0');
      railName.textContent = chapters[active].dataset.chapter || 'Showroom';
      railProgress.style.transform = 'scaleX(' + storyState.progress.toFixed(4) + ')';
    }
  }

  window.addEventListener('scroll', () => {
    updateStory();
    settleStory();
  }, { passive: true });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'max',
      onUpdate: settleStory,
      onRefresh: updateStory
    });
  }
  window.addEventListener('resize', updateStory);
  updateStory();

  function hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch (error) {
      return false;
    }
  }

  if (!hasWebGL()) {
    if (loading) loading.classList.add('is-done');
    return;
  }

  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  const importMap = document.createElement('script');
  importMap.type = 'importmap';
  importMap.textContent = JSON.stringify({
    imports: {
      'three': './assets/vendor/three.module.min.js',
      'three/addons/': './assets/vendor/addons/'
    }
  });
  document.head.appendChild(importMap);

  Promise.all([
    import('../vendor/three.module.min.js'),
    import('../vendor/addons/loaders/GLTFLoader.js'),
    import('../vendor/addons/loaders/DRACOLoader.js')
  ]).then(([THREE, gltfModule, dracoModule]) => {
    init(THREE, gltfModule.GLTFLoader, dracoModule.DRACOLoader);
  }).catch(() => {
    if (loading) loading.classList.add('is-done');
  });

  function init(THREE, GLTFLoader, DRACOLoader) {
    stage.classList.add('is-live');

    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = !lowPower && !reduceMotion;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x050607);
    function addPanel(color, width, height, x, y, z, rx, ry) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      );
      panel.position.set(x, y, z);
      panel.rotation.set(rx, ry, 0);
      envScene.add(panel);
    }
    addPanel(0xffffff, 10, 1.6, 0, 7.5, 0, Math.PI / 2, 0);
    addPanel(0xdce8ff, 3.2, 7, -7, 3, 0, 0, Math.PI / 2);
    addPanel(0xffdfb3, 4.4, 6, 7, 3, 1, 0, -Math.PI / 2);
    addPanel(0xf2f5ff, 6, 2.2, 0, 3, -7, 0, 0);
    addPanel(0xe6a230, 1.6, 5, 0, 3, 7, 0, Math.PI);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({ color: 0x07090a, metalness: 0.74, roughness: 0.38, envMapIntensity: 0.45 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(46, 46, 0x1b2023, 0x101416);
    grid.position.y = -0.212;
    grid.material.transparent = true;
    grid.material.opacity = 0.24;
    scene.add(grid);

    const hemi = new THREE.HemisphereLight(0xd6e4f2, 0x080a0b, 0.5);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d8, 1.8);
    key.position.set(-4, 7, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe6a230, 1.35);
    rim.position.set(5, 3.5, -5);
    scene.add(rim);

    const showroomRoot = new THREE.Group();
    scene.add(showroomRoot);

    const spot = new THREE.SpotLight(0xfff0d8, 72, 24, 0.42, 0.62, 1.5);
    spot.position.set(0, 7.3, 0.4);
    spot.castShadow = renderer.shadowMap.enabled;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.camera.near = 0.5;
    spot.shadow.camera.far = 24;
    showroomRoot.add(spot);
    showroomRoot.add(spot.target);
    spot.target.position.set(0, 0, 0);

    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 32;
    beamCanvas.height = 256;
    const beamCtx = beamCanvas.getContext('2d');
    const beamGradient = beamCtx.createLinearGradient(0, 0, 0, 256);
    beamGradient.addColorStop(0, 'rgba(255,245,225,0.72)');
    beamGradient.addColorStop(0.35, 'rgba(255,240,215,0.22)');
    beamGradient.addColorStop(1, 'rgba(255,240,215,0)');
    beamCtx.fillStyle = beamGradient;
    beamCtx.fillRect(0, 0, 32, 256);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 3.05, 7.1, 64, 1, true),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(beamCanvas),
        color: 0xffe9c8,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    beam.position.y = 3.7;
    showroomRoot.add(beam);

    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.52, 0.3, 48),
      new THREE.MeshStandardMaterial({ color: 0x111518, metalness: 0.92, roughness: 0.26 })
    );
    housing.position.y = 7.35;
    showroomRoot.add(housing);
    const housingRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.025, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe2b0 })
    );
    housingRing.rotation.x = Math.PI / 2;
    housingRing.position.y = 7.19;
    showroomRoot.add(housingRing);

    const turntable = new THREE.Group();
    turntable.rotation.y = Math.PI;
    showroomRoot.add(turntable);

    const platformMat = new THREE.MeshPhysicalMaterial({ color: 0x111518, metalness: 0.95, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
    const topMat = new THREE.MeshPhysicalMaterial({ color: 0x191e21, metalness: 0.88, roughness: 0.19, clearcoat: 1, envMapIntensity: 1.2 });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.45, 0.22, 96), platformMat);
    platform.position.y = -0.12;
    platform.receiveShadow = true;
    turntable.add(platform);
    const platformTop = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.02, 96), topMat);
    platformTop.position.y = 0.005;
    platformTop.receiveShadow = true;
    turntable.add(platformTop);

    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xe6a230, transparent: true, opacity: 0.72 });
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xc7ccd0, transparent: true, opacity: 0.24 });
    [3.16, 2.55, 1.75].forEach((radius, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, i === 0 ? 0.018 : 0.009, 8, 128), i === 0 ? outerRingMat : innerRingMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.023;
      turntable.add(ring);
    });

    const tickGeo = new THREE.BoxGeometry(0.018, 0.008, 0.16);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xc7ccd0, transparent: true, opacity: 0.34 });
    const accentTickMat = new THREE.MeshBasicMaterial({ color: 0xe6a230, transparent: true, opacity: 0.78 });
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const accent = i % 5 === 0;
      const tick = new THREE.Mesh(tickGeo, accent ? accentTickMat : tickMat);
      tick.position.set(Math.cos(angle) * 3.29, 0.026, Math.sin(angle) * 3.29);
      tick.rotation.y = -angle;
      if (accent) tick.scale.z = 1.7;
      turntable.add(tick);
    }

    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: FINISHES[0].hex, metalness: 1, roughness: 0.23, clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 1.35 });
    const detailsMaterial = new THREE.MeshStandardMaterial({ color: 0xd8dde0, metalness: 1, roughness: 0.27, envMapIntensity: 1.2 });
    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x9fb6bd, metalness: 0.4, roughness: 0.09, transparent: true, opacity: 0.58, clearcoat: 1, envMapIntensity: 1.6 });

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    let baseCameraY = 2.2;
    let baseCameraZ = 10.8;
    const pointer = { x: 0, y: 0 };
    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let ready = false;
    let lastSwatch = -1;
    const intro = { v: reduceMotion ? 1 : 0 };

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
        car.traverse(object => {
          if (object.isMesh) {
            object.castShadow = renderer.shadowMap.enabled;
            object.receiveShadow = renderer.shadowMap.enabled;
          }
        });

        const shadowMap = new THREE.TextureLoader().load('assets/models/ferrari_ao.png');
        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
          new THREE.MeshBasicMaterial({ map: shadowMap, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true, premultipliedAlpha: true, depthWrite: false })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.renderOrder = 2;
        car.add(shadowPlane);

        car.scale.setScalar(0.82);
        turntable.add(car);
        ready = true;
        if (loading) loading.classList.add('is-done');
        if (window.gsap && !reduceMotion) {
          gsap.to(intro, { v: 1, duration: 1.9, ease: 'power3.out', delay: 0.12 });
        }
      },
      event => {
        if (loading && event.total) {
          const pct = clamp((event.loaded / event.total) * 100, 4, 100);
          const bar = loading.querySelector('i');
          if (bar) bar.style.transform = 'scaleX(' + (pct / 100).toFixed(3) + ')';
        }
      },
      () => {
        if (loading) loading.classList.add('is-done');
      }
    );

    stage.addEventListener('pointerdown', event => {
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      stage.classList.add('is-dragging');
      if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!dragging) return;
      turntable.rotation.y += (event.clientX - lastPointerX) * 0.007;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    });
    const stopDrag = () => {
      dragging = false;
      stage.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup', stopDrag);
    stage.addEventListener('pointercancel', stopDrag);
    stage.addEventListener('pointerleave', stopDrag);

    function resize() {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const mobile = width < 700;
      camera.fov = mobile ? 42 : 34;
      baseCameraY = mobile ? 2.6 : 2.2;
      baseCameraZ = mobile ? 12.6 : 10.8;
      camera.updateProjectionMatrix();
      updateStory();
    }
    window.addEventListener('resize', resize);
    resize();

    const lightStops = [
      new THREE.Color(0xfff0d8),
      new THREE.Color(0xdce8ff),
      new THREE.Color(0xffd9a1),
      new THREE.Color(0xeaf4ff),
      new THREE.Color(0xfff1dc),
      new THREE.Color(0xffd8a3),
      new THREE.Color(0xfff0d8)
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
      const maxIndex = stops.length - 1;
      const index = clamp(Math.floor(t), 0, maxIndex - 1);
      const local = clamp(t - index, 0, 1);
      return target.copy(stops[index]).lerp(stops[index + 1], local);
    }

    let lastTime = performance.now();
    let currentX = storyState.targetX;

    function render(now) {
      requestAnimationFrame(render);
      if (!ready || document.hidden) {
        lastTime = now;
        return;
      }

      const delta = clamp((now - lastTime) / 1000, 0, 0.05);
      lastTime = now;
      const mobile = window.innerWidth < 700;
      const storyT = storyState.chapterFloat;
      const targetX = storyState.targetX * (mobile ? 0.22 : 1);
      currentX = lerp(currentX, targetX, clamp(delta * 3.4, 0, 1));

      const scale = mobile ? 0.52 : 0.82;
      showroomRoot.scale.setScalar(scale * lerp(0.88, 1, intro.v));
      showroomRoot.position.x = lerp(mobile ? 0 : 6.5, currentX, intro.v);
      showroomRoot.position.y = mobile ? -1.18 : 0;

      if (!reduceMotion) {
        turntable.rotation.y += delta * (0.26 + Math.min(storyState.velocity * 0.0018, 0.42));
      }
      storyState.velocity *= 0.94;

      if (finishState.mode === 'auto') {
        sample(finishStops, storyT, tempColour);
        bodyMaterial.color.copy(tempColour);
        const nearest = clamp(Math.round(storyT), 0, 6);
        const finishIndex = [0, 1, 2, 1, 0, 1, 0][nearest];
        if (finishIndex !== lastSwatch) {
          lastSwatch = finishIndex;
          swatches.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.finish) === finishIndex)));
          if (autoButton) autoButton.setAttribute('aria-pressed', 'true');
        }
      } else {
        bodyMaterial.color.setHex(FINISHES[finishState.manual].hex);
      }

      sample(lightStops, storyT, tempLight);
      spot.color.copy(tempLight);
      key.color.copy(tempLight);
      beam.material.color.copy(tempLight);
      rim.color.setHex(storyT > 2 && storyT < 4 ? 0xcfe3ff : 0xe6a230);

      camera.position.x = pointer.x * (mobile ? 0.08 : 0.26);
      camera.position.y = baseCameraY + pointer.y * 0.16 + Math.sin(now * 0.00018) * 0.04;
      camera.position.z = baseCameraZ;
      camera.lookAt(0, mobile ? 0.15 : 0.62, 0);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(render);
  }
})();
