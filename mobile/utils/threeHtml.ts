import { ContourPoint } from './sampleTemplates';

export interface Studio3DPayload {
  imageUri: string;
  contour: ContourPoint[];
  edgeColorHex: string;
  heightCm: number;
  depthCm: number;
  includeStand: boolean;
  unfoldProgress: number; // 0..100
  spin: boolean;
}

/**
 * Generates self-contained Three.js r128 WebView with:
 * - Custom GLSL cardstock ShaderMaterial (matte grain, abs() view-dependent sheen,
 *   diagonal reveal shimmer, mipmap-free sharp texture clarity)
 * - Crisp non-puffed ExtrudeGeometry (`bevelEnabled: false`) + dark EdgesGeometry creases
 * - Soft radial contact shadow on cutting-mat turntable
 * - 850ms cubic-ease-out intro swoop + angular momentum inertia + damped unfold/size
 * - Clean visibilitychange pause/resume
 */
export function buildStudio3DHtml(initial: Studio3DPayload): string {
  const safeJson = JSON.stringify(initial).replace(/<\/script>/gi, '<\\/script>');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0d1f1a;
    touch-action: none;
    user-select: none;
    font-family: system-ui, -apple-system, sans-serif;
  }
  #host { width: 100%; height: 100%; }
  #fallbackMsg {
    display: none;
    position: absolute;
    inset: 0;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #9db8af;
    font-size: 13px;
    padding: 20px;
  }
</style>
</head>
<body>
<div id="host"></div>
<div id="fallbackMsg">Three.js 3D engine could not load (check internet for initial CDN script cache).</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function() {
  var state = ${safeJson};
  if (typeof THREE === 'undefined') {
    document.getElementById('fallbackMsg').style.display = 'flex';
    return;
  }

  var host = document.getElementById('host');
  var w = window.innerWidth || 340;
  var h = window.innerHeight || 280;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 3));
  renderer.setSize(w, h);
  host.appendChild(renderer.domElement);

  var maxAniso = renderer.capabilities && renderer.capabilities.getMaxAnisotropy
    ? renderer.capabilities.getMaxAnisotropy()
    : 4;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100);
  camera.position.set(0, 0.45, 7.6);

  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  var dir1 = new THREE.DirectionalLight(0xffffff, 0.55);
  dir1.position.set(3, 5, 6);
  scene.add(dir1);
  var dir2 = new THREE.DirectionalLight(0xeef6f2, 0.4);
  dir2.position.set(-4, 2, -5);
  scene.add(dir2);

  // Green cutting-mat turntable pedestal
  var disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.85, 0.11, 44),
    new THREE.MeshStandardMaterial({ color: 0x24493e, roughness: 0.85 })
  );
  disc.position.y = -1.62;
  scene.add(disc);

  // Soft contact shadow ellipse on turntable
  var shadowMesh = (function() {
    var sc = document.createElement('canvas');
    sc.width = 256; sc.height = 256;
    var sctx = sc.getContext('2d');
    var g = sctx.createRadialGradient(128, 128, 10, 128, 128, 122);
    g.addColorStop(0, 'rgba(6, 18, 14, 0.54)');
    g.addColorStop(0.55, 'rgba(6, 18, 14, 0.22)');
    g.addColorStop(1, 'rgba(6, 18, 14, 0.0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 256, 256);
    var stex = new THREE.CanvasTexture(sc);
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.35),
      new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -1.555;
    return mesh;
  })();
  scene.add(shadowMesh);

  var root = new THREE.Group();
  scene.add(root);

  var extrudeBody = null;
  var edgeLines = null;
  var frontPlane = null;
  var backPlane = null;
  var standMesh = null;
  var flatStripMesh = null;
  var shaderUniforms = [];

  var VERT_SHADER = [
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'varying vec3 vViewDir;',
    'void main() {',
    '  vUv = uv;',
    '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vViewDir = normalize(-mvPos.xyz);',
    '  gl_Position = projectionMatrix * mvPos;',
    '}'
  ].join('\\n');

  var FRAG_SHADER = [
    'uniform sampler2D uMap;',
    'uniform float uReveal;',
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'varying vec3 vViewDir;',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'void main() {',
    '  vec4 tex = texture2D(uMap, vUv);',
    '  if (tex.a < 0.15) discard;',
    '  float grain = (hash21(vUv * 420.0) - 0.5) * 0.025;',
    '  vec3 col = tex.rgb + vec3(grain);',
    '  float ndotv = abs(dot(normalize(vNormal), normalize(vViewDir)));',
    '  float grazing = pow(1.0 - ndotv, 2.2) * 0.11;',
    '  float centerSheen = pow(ndotv, 6.0) * 0.03;',
    '  col += vec3(grazing + centerSheen);',
    '  if (uReveal < 0.999) {',
    '    float diag = vUv.x * 0.65 + (1.0 - vUv.y) * 0.35;',
    '    float sweep = mix(-0.25, 1.25, uReveal);',
    '    float band = exp(-pow((diag - sweep) / 0.12, 2.0));',
    '    col += vec3(0.32, 0.38, 0.34) * band * (1.0 - uReveal * 0.5);',
    '  }',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), tex.a);',
    '}'
  ].join('\\n');

  var modelMetrics = { modelW: 2.0, clampedH: 2.4, depth: 0.35, baseHeightCm: 18 };
  var rotY = -0.35;
  var rotX = 0.06;
  var velY = 0;
  var velX = 0;
  var dragging = false;
  var lastX = 0, lastY = 0;

  var currentUnfold = state.unfoldProgress || 0;
  var targetUnfold = state.unfoldProgress || 0;
  var currentScale = 1.0;
  var targetScale = 1.0;
  var introStart = 0;
  var rafId = null;

  function notifyParent(type) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
    }
  }

  var el = renderer.domElement;
  el.addEventListener('touchstart', function(e) {
    if (e.touches[0]) {
      dragging = true;
      velY = 0;
      velX = 0;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      notifyParent('dragStart');
    }
  }, { passive: true });
  el.addEventListener('touchmove', function(e) {
    if (!dragging || !e.touches[0]) return;
    var cx = e.touches[0].clientX;
    var cy = e.touches[0].clientY;
    var dy = (cx - lastX) * 0.014;
    var dx = (cy - lastY) * 0.009;
    rotY += dy;
    rotX = Math.max(-0.75, Math.min(0.75, rotX + dx));
    velY = dy;
    velX = dx;
    lastX = cx;
    lastY = cy;
  }, { passive: true });
  el.addEventListener('touchend', function() {
    dragging = false;
    notifyParent('dragEnd');
  });

  function disposeGroup(group) {
    while (group.children.length) {
      var ch = group.children[0];
      group.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        if (ch.material.map) ch.material.map.dispose();
        if (ch.material.uniforms && ch.material.uniforms.uMap && ch.material.uniforms.uMap.value) {
          ch.material.uniforms.uMap.value.dispose();
        }
        ch.material.dispose();
      }
    }
    extrudeBody = null;
    edgeLines = null;
    frontPlane = null;
    backPlane = null;
    standMesh = null;
    flatStripMesh = null;
    shaderUniforms = [];
  }

  function makeSharpTexture(src, mirror, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var nw = img.naturalWidth || 512;
      var nh = img.naturalHeight || 512;
      var scale = Math.min(1, 1024 / Math.max(nw, nh));
      var cw = Math.max(128, Math.round(nw * scale));
      var ch = Math.max(128, Math.round(nh * scale));
      var c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (mirror) {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, 0, 0, cw, ch);

      var tex = new THREE.CanvasTexture(c);
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
      cb(tex, nw / Math.max(1, nh));
    };
    img.onerror = function() { cb(null, 1.0); };
    img.src = src;
  }

  function createCardstockMat(tex) {
    var uniforms = {
      uMap: { value: tex },
      uReveal: { value: 0.0 }
    };
    shaderUniforms.push(uniforms);
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  function applyTransformState() {
    var t = Math.max(0, Math.min(1, currentUnfold / 100));
    var faceZ = modelMetrics.depth / 2 + 0.008;

    root.scale.setScalar(currentScale);

    if (extrudeBody) {
      var foldedVis = t < 0.18;
      extrudeBody.visible = foldedVis;
      if (edgeLines) edgeLines.visible = foldedVis;
      var sz = Math.max(0.01, 1 - t * 4);
      extrudeBody.scale.set(1, 1, sz);
      if (edgeLines) edgeLines.scale.set(1, 1, sz);
    }

    if (frontPlane) {
      var spread = Math.max(0.95, modelMetrics.modelW * 0.58);
      frontPlane.position.set(-spread * t, 0.28 * t, faceZ * (1 - t));
    }

    if (backPlane) {
      var spreadB = Math.max(0.95, modelMetrics.modelW * 0.58);
      backPlane.position.set(spreadB * t, 0.28 * t, -faceZ * (1 - t));
      backPlane.rotation.y = Math.PI * (1 - t);
    }

    if (flatStripMesh) {
      flatStripMesh.visible = t >= 0.06;
      flatStripMesh.position.set(0, -modelMetrics.clampedH * 0.5 * t - 0.32 * t, 0);
      flatStripMesh.rotation.x = (1 - t) * (Math.PI / 2);
    }

    if (standMesh) {
      standMesh.visible = !!state.includeStand;
      var standY = -modelMetrics.clampedH / 2 - 0.04;
      standMesh.position.set(0, standY * (1 - t) + (-1.52) * t, 0);
      standMesh.rotation.x = t * (Math.PI / 2);
    }

    var matVisible = t < 0.15;
    disc.visible = matVisible;
    shadowMesh.visible = matVisible;
    if (matVisible) {
      var shScale = Math.max(0.65, (modelMetrics.modelW * currentScale) / 2.0);
      shadowMesh.scale.set(shScale, 1.0, 1.0);
    }
  }

  function rebuildMesh(cfg) {
    state = cfg;
    makeSharpTexture(cfg.imageUri, false, function(frontTex, aspect) {
      makeSharpTexture(cfg.imageUri, true, function(backTex) {
        disposeGroup(root);

        var baseH = cfg.heightCm || 18;
        var modelH = 2.55 * (baseH / 18);
        var clampedH = Math.max(1.5, Math.min(2.95, modelH));
        var modelW = clampedH * (aspect || 1);
        var depth = Math.max(0.24, ((cfg.depthCm || 2.5) / Math.max(10, baseH)) * clampedH * 1.45);
        modelMetrics = { modelW: modelW, clampedH: clampedH, depth: depth, baseHeightCm: baseH };
        currentScale = 0.92;
        targetScale = 1.0;

        var pts = (cfg.contour && cfg.contour.length >= 3)
          ? cfg.contour
          : [{x:0.12,y:0.08},{x:0.88,y:0.08},{x:0.88,y:0.92},{x:0.12,y:0.92}];

        var shape = new THREE.Shape();
        for (var i = 0; i < pts.length; i++) {
          var px = (pts[i].x - 0.5) * modelW;
          var py = (0.5 - pts[i].y) * clampedH;
          if (i === 0) shape.moveTo(px, py);
          else shape.lineTo(px, py);
        }
        shape.closePath();

        var extrudeGeom = new THREE.ExtrudeGeometry(shape, {
          depth: depth,
          bevelEnabled: false,
          curveSegments: 8
        });
        extrudeGeom.translate(0, 0, -depth / 2);

        extrudeBody = new THREE.Mesh(
          extrudeGeom,
          new THREE.MeshLambertMaterial({ color: new THREE.Color(cfg.edgeColorHex || '#2ec4b6') })
        );
        root.add(extrudeBody);

        edgeLines = new THREE.LineSegments(
          new THREE.EdgesGeometry(extrudeGeom, 24),
          new THREE.LineBasicMaterial({ color: 0x17201d, transparent: true, opacity: 0.48 })
        );
        root.add(edgeLines);

        var faceZ = depth / 2 + 0.008;
        if (frontTex) {
          frontPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(modelW, clampedH),
            createCardstockMat(frontTex)
          );
          frontPlane.position.z = faceZ;
          root.add(frontPlane);
        }
        if (backTex) {
          backPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(modelW, clampedH),
            createCardstockMat(backTex)
          );
          backPlane.position.z = -faceZ;
          backPlane.rotation.y = Math.PI;
          root.add(backPlane);
        }

        flatStripMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.max(2.6, modelW * 1.4), Math.max(0.32, depth * 1.15)),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.edgeColorHex || '#2ec4b6'), side: THREE.DoubleSide })
        );
        flatStripMesh.visible = false;
        root.add(flatStripMesh);

        var standW = Math.max(0.75, modelW * 0.62);
        standMesh = new THREE.Mesh(
          new THREE.BoxGeometry(standW, 0.06, Math.max(0.55, depth + 0.52)),
          new THREE.MeshLambertMaterial({ color: 0xfdfdfb })
        );
        standMesh.visible = !!cfg.includeStand;
        root.add(standMesh);

        introStart = performance.now();
        applyTransformState();
      });
    });
  }

  var lastUri = '';
  var lastContourLen = 0;

  window.updateStudio3D = function(nextCfg) {
    var needsRebuild =
      nextCfg.imageUri !== lastUri ||
      nextCfg.edgeColorHex !== state.edgeColorHex ||
      (nextCfg.contour ? nextCfg.contour.length : 0) !== lastContourLen;

    state.includeStand = !!nextCfg.includeStand;
    state.spin = !!nextCfg.spin;
    targetUnfold = nextCfg.unfoldProgress || 0;

    if (needsRebuild) {
      lastUri = nextCfg.imageUri;
      lastContourLen = nextCfg.contour ? nextCfg.contour.length : 0;
      rebuildMesh(nextCfg);
    } else {
      targetScale = Math.max(0.7, Math.min(1.25, (nextCfg.heightCm || 18) / Math.max(10, modelMetrics.baseHeightCm)));
    }
  };

  window.setStudioSpin = function(spin) {
    state.spin = !!spin;
  };
  window.resetStudioCam = function() {
    rotY = 0.25;
    rotX = 0.06;
    velY = 0;
    velX = 0;
    targetUnfold = 0;
  };

  window.addEventListener('resize', function() {
    var nw = window.innerWidth || 340;
    var nh = window.innerHeight || 280;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });

  function animate(now) {
    if (document.hidden) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(animate);

    // 850ms cubic-ease-out intro swoop + uReveal shimmer
    var elapsed = introStart ? (now - introStart) : 9999;
    var introT = Math.min(1, Math.max(0, elapsed / 850));
    var easeOut = 1 - Math.pow(1 - introT, 3);
    camera.position.z = 7.6 - 1.4 * easeOut;
    camera.position.y = 0.45 - 0.27 * easeOut;

    for (var u = 0; u < shaderUniforms.length; u++) {
      shaderUniforms[u].uReveal.value = easeOut;
    }

    // Damped unfold & size transitions
    currentUnfold += (targetUnfold - currentUnfold) * 0.16;
    currentScale += (targetScale - currentScale) * 0.18;
    applyTransformState();

    var unfoldT = currentUnfold / 100;
    if (unfoldT <= 0.05) {
      if (!dragging) {
        rotY += velY;
        rotX = Math.max(-0.75, Math.min(0.75, rotX + velX));
        velY *= 0.93;
        velX *= 0.88;
        if (state.spin && Math.abs(velY) < 0.004) {
          rotY += 0.007;
        }
      }
      root.rotation.y = rotY;
      root.rotation.x = rotX;
    } else {
      root.rotation.y = rotY * (1 - Math.min(1, unfoldT * 1.5));
      root.rotation.x = rotX * (1 - Math.min(1, unfoldT * 1.5));
    }

    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(animate);
    }
  });
  window.addEventListener('pagehide', function() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  lastUri = state.imageUri;
  lastContourLen = state.contour ? state.contour.length : 0;
  rebuildMesh(state);
  rafId = requestAnimationFrame(animate);
})();
</script>
</body>
</html>`;
}
