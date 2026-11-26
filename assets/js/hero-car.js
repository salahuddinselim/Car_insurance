(() => {
  const stage = document.getElementById('heroStage');
  if (!stage) return;

  const hero = stage.closest('.hero') || document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.body.classList.add('has-car-stage');
  document.body.appendChild(stage);

  const loaderUI = document.createElement('div');
  loaderUI.className = 'car-loading';
  loaderUI.innerHTML = '<span class="car-loading__text">Loading vehicle</span><span class="car-loading__bar"><i></i></span>';
  document.body.appendChild(loaderUI);

  const poster = document.createElement('div');
  poster.className = 'car-poster';
  poster.innerHTML = '<svg viewBox="0 0 720 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M48 205h36c8-34 28-52 62-57l58-6 52-52c10-10 24-15 41-15h92c18 0 31 6 43 18l45 48 62 12c28 6 44 19 49 52h34v26H48z" fill="#202528" stroke="#e6a230" stroke-width="3"/><circle cx="190" cy="232" r="38" fill="#101315" stroke="#e6a230" stroke-width="3"/><circle cx="530" cy="232" r="38" fill="#101315" stroke="#e6a230" stroke-width="3"/><circle cx="190" cy="232" r="14" fill="#6b6f70"/><circle cx="530" cy="232" r="14" fill="#6b6f70"/></svg>';
  stage.appendChild(poster);

  const FINISHES = [
    { hex: 0xd40000, label: 'Red finish', css: '#d40000' },
    { hex: 0xe4e0d5, label: 'Bone finish', css: '#e4e0d5' },
    { hex: 0x3b4246, label: 'Charcoal finish', css: '#3b4246' }
  ];

  let swatches = [];
  let resetButton;

  function buildUI(onColour, onReset) {
    const ui = document.createElement('div');
    ui.className = 'car-ui';
    ui.innerHTML =
      '<div class="car-row" role="group" aria-label="Paint finish">' +
      '<span class="car-label">Finish</span>' +
      FINISHES.map((c, i) => '<button type="button" class="car-swatch" data-colour="' + i + '" aria-label="' + c.label + '" aria-pressed="' + (i === 0) + '" style="background:' + c.css + '"></button>').join('') +
      '<button type="button" class="car-reset" id="carReset">Auto</button></div>' +
      '<div class="car-hint">Drag to rotate · scroll to change finish</div>';
    document.body.appendChild(ui);
    swatches = Array.from(ui.querySelectorAll('.car-swatch'));
    resetButton = ui.querySelector('#carReset');
    swatches.forEach(swatch => swatch.addEventListener('click', () => onColour(Number(swatch.dataset.colour))));
    resetButton.addEventListener('click', onReset);
  }

  function hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }

  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  if (!hasWebGL() || lowPower) {
    stage.classList.add('is-fallback');
    loaderUI.classList.add('is-done');
    return;
  }

  let started = false;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting) && !started) {
      started = true;
      observer.disconnect();
      setTimeout(start, 900);
    }
  }, { rootMargin: '400px' });
  observer.observe(hero);

  async function start() {
    const map = document.createElement('script');
    map.type = 'importmap';
    map.textContent = JSON.stringify({
      imports: {
        'three': './assets/vendor/three.module.min.js',
        'three/addons/': './assets/vendor/addons/'
      }
    });
    document.head.appendChild(map);

    try {
      const [THREE, gltfModule, dracoModule, roomModule] = await Promise.all([
        import('../vendor/three.module.min.js'),
        import('../vendor/addons/loaders/GLTFLoader.js'),
        import('../vendor/addons/loaders/DRACOLoader.js'),
        import('../vendor/addons/environments/RoomEnvironment.js')
      ]);
      init(THREE, gltfModule.GLTFLoader, dracoModule.DRACOLoader, roomModule.RoomEnvironment);
    } catch (e) {
      loaderUI.classList.add('is-done');
      stage.classList.add('is-fallback');
    }
  }

  function init(THREE, GLTFLoader, DRACOLoader, RoomEnvironment) {
    stage.removeAttribute('aria-hidden');
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', 'Interactive car preview');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    scene.add(new THREE.HemisphereLight(0xf6f1e6, 0x171b1e, 0.9));
    const key = new THREE.DirectionalLight(0xfff1d6, 2.2);
    key.position.set(-4, 7, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe6a230, 1.8);
    rim.position.set(5, 3.5, -5);
    scene.add(rim);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: FINISHES[0].hex, metalness: 1, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.03 });
    const detailsMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.5 });
    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x9fb6bd, metalness: 0.6, roughness: 0.12, transparent: true, opacity: 0.62, clearcoat: 1 });

    const carRoot = new THREE.Group();
    scene.add(carRoot);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext('2d');
    const gradient = shadowCtx.createRadialGradient(128, 128, 8, 128, 128, 124);
    gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowCtx.fillStyle = gradient;
    shadowCtx.fillRect(0, 0, 256, 256);
    const groundShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
    );
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = 0.01;
    carRoot.add(groundShadow);
    const wheels = [];
    let ferrariModel = null;
    let bmwRoot = null;
    let bmwLoading = false;
    let ready = false;
    let scrollP = 0;
    let manualColour = -1;
    let dirty = true;
    let lastHalf = -1;
    const intro = { v: 0 };

    const draco = new DRACOLoader();
    draco.setDecoderPath('assets/vendor/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);

    gltfLoader.load(
      'assets/models/ferrari.glb',
      gltf => {
        const car = gltf.scene.children[0];
        car.getObjectByName('body').material = bodyMaterial;
        ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach(name => {
          car.getObjectByName(name).material = detailsMaterial;
        });
        car.getObjectByName('glass').material = glassMaterial;
        ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach(name => {
          const wheel = car.getObjectByName(name);
          if (wheel) wheels.push(wheel);
        });

        const shadow = new THREE.TextureLoader().load('assets/models/ferrari_ao.png');
        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
          new THREE.MeshBasicMaterial({ map: shadow, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true, premultipliedAlpha: true })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.renderOrder = 2;
        car.add(shadowPlane);

        ferrariModel = car;
        carRoot.add(car);
        carRoot.scale.setScalar(0.82);
        ready = true;
        loaderUI.classList.add('is-done');
        if (window.gsap) {
          window.gsap.to(intro, { v: 1, duration: 1.9, ease: 'power3.out', delay: 0.1, onUpdate: () => { dirty = true; } });
        } else {
          intro.v = 1;
        }
      },
      event => {
        if (event.total) {
          const pct = Math.max(4, Math.min(100, (event.loaded / event.total) * 100));
          loaderUI.querySelector('i').style.width = pct + '%';
        }
      },
      () => {
        loaderUI.classList.add('is-done');
        stage.classList.add('is-fallback');
      }
    );

    function loadBMW() {
      if (bmwLoading || bmwRoot) return;
      bmwLoading = true;
      gltfLoader.load('assets/models/bmw_m4.glb', gltf => {
        const inner = new THREE.Group();
        inner.add(gltf.scene);
        inner.rotation.y = Math.PI / 2;
        const fitted = new THREE.Group();
        fitted.add(inner);
        const bounds = new THREE.Box3().setFromObject(fitted);
        const size = bounds.getSize(new THREE.Vector3());
        fitted.scale.setScalar(4.3 / Math.max(size.x, size.z));
        const scaled = new THREE.Box3().setFromObject(fitted);
        const centre = scaled.getCenter(new THREE.Vector3());
        fitted.position.set(-centre.x, -scaled.min.y, -centre.z);
        const swapGroup = new THREE.Group();
        swapGroup.add(fitted);
        swapGroup.visible = false;
        swapGroup.scale.setScalar(0);
        carRoot.add(swapGroup);
        bmwRoot = swapGroup;
        dirty = true;
      }, undefined, () => { bmwLoading = false; });
    }

    buildUI(index => {
      manualColour = index;
      bodyMaterial.color.setHex(FINISHES[index].hex);
      swatches.forEach((swatch, i) => swatch.setAttribute('aria-pressed', String(i === index)));
      dirty = true;
    }, () => {
      manualColour = -1;
      swatches.forEach((swatch, i) => swatch.setAttribute('aria-pressed', String(i === 0)));
      dirty = true;
    });

    if (window.gsap && window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'max',
        onUpdate: self => {
          scrollP = self.progress;
          dirty = true;
          if (scrollP > 0.18) loadBMW();
        }
      });
    } else {
      const onScroll = () => {
        const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollP = Math.max(0, Math.min(1, window.scrollY / total));
        dirty = true;
        if (scrollP > 0.18) loadBMW();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    let yaw = 0.32;
    let pitch = 0;
    let yawVelocity = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    stage.addEventListener('pointerdown', event => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
      if (!dragging) return;
      yawVelocity = (event.clientX - lastX) * 0.008;
      yaw += yawVelocity;
      pitch = THREE.MathUtils.clamp(pitch - (event.clientY - lastY) * 0.002, -0.16, 0.2);
      lastX = event.clientX;
      lastY = event.clientY;
      dirty = true;
    });
    const stopDrag = () => {
      dragging = false;
      stage.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup', stopDrag);
    stage.addEventListener('pointercancel', stopDrag);

    function resize() {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      dirty = true;
    }
    window.addEventListener('resize', resize);
    resize();

    const red = new THREE.Color(FINISHES[0].hex);
    const bone = new THREE.Color(FINISHES[1].hex);
    const charcoal = new THREE.Color(FINISHES[2].hex);
    const tempColour = new THREE.Color();

    function targetX(p) {
      if (p < 0.12) return THREE.MathUtils.lerp(1.3, 1.1, p / 0.12);
      if (p < 0.3) return THREE.MathUtils.lerp(1.1, -1.2, (p - 0.12) / 0.18);
      if (p < 0.5) return THREE.MathUtils.lerp(-1.2, 1.3, (p - 0.3) / 0.2);
      if (p < 0.72) return THREE.MathUtils.lerp(1.3, -1.4, (p - 0.5) / 0.22);
      return THREE.MathUtils.lerp(-1.4, -0.8, (p - 0.72) / 0.28);
    }

    function scrollRotation(p) {
      return p < 0.5 ? p * Math.PI * 4 : (1 - p) * Math.PI * 4;
    }

    function render(time) {
      if (!ready || document.hidden) return;

      if (dragging) yaw += 0.008;
      else if (Math.abs(yawVelocity) > 0.0002) {
        yaw += yawVelocity;
        yawVelocity *= 0.92;
        dirty = true;
      } else yawVelocity = 0;

      const p = scrollP;
      const half = p >= 0.62 ? 1 : 0;
      if (half !== lastHalf) {
        lastHalf = half;
        document.body.classList.toggle('car-left', half === 1);
        document.body.classList.toggle('car-brand-bmw', half === 1);
      }
      const mobile = window.innerWidth < 700;
      const finalX = mobile ? targetX(p) * 0.25 : targetX(p);
      carRoot.scale.setScalar(mobile ? 0.5 : THREE.MathUtils.lerp(0.82, 0.62, Math.min(1, p * 2)));
      carRoot.position.x = THREE.MathUtils.lerp(-7, finalX, intro.v);
      carRoot.position.y = mobile ? -1.45 : 0.02;
      carRoot.rotation.y = Math.PI + (intro.v - 1) * -0.9 + scrollRotation(p);

      const swap = THREE.MathUtils.clamp((p - 0.48) / 0.08, 0, 1);
      if (ferrariModel) {
        ferrariModel.visible = swap < 1;
        ferrariModel.scale.setScalar(1 - swap);
      }
      if (bmwRoot) {
        bmwRoot.visible = swap > 0;
        bmwRoot.scale.setScalar(swap);
      }

      if (manualColour === -1) {
        if (p < 0.3) bodyMaterial.color.copy(red);
        else if (p < 0.62) bodyMaterial.color.lerpColors(red, bone, (p - 0.3) / 0.32);
        else bodyMaterial.color.lerpColors(bone, charcoal, Math.min(1, (p - 0.62) / 0.38));
        const nearest = p < 0.42 ? 0 : p < 0.78 ? 1 : 2;
        swatches.forEach((swatch, i) => swatch.setAttribute('aria-pressed', String(i === nearest)));
      } else {
        bodyMaterial.color.copy(tempColour.setHex(FINISHES[manualColour].hex));
      }

      wheels.forEach(wheel => { wheel.rotation.x = -p * 16; });

      const radius = mobile ? 9.2 : 8.0;
      const theta = yaw;
      camera.position.set(
        Math.sin(theta) * radius,
        (mobile ? 1.6 : 1.4) + pitch * 4,
        Math.cos(theta) * radius
      );
      camera.lookAt(0, 0.55, 0);
      renderer.render(scene, camera);
    }

    function loop(time) {
      requestAnimationFrame(loop);
      if (dirty) {
        dirty = false;
        render(time);
      }
    }
    loop(0);
  }
})();
