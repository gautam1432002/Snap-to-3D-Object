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
 * Generates self-contained Three.js r128 WebView combining:
 * 1) Razor-sharp non-puffed ExtrudeGeometry cardstock model (`bevelEnabled: false`,
 *    mipmaps disabled with LinearFilter + max anisotropy for crystal-clear scanned textures)
 * 2) Smooth in-place 3D <-> 2D Unfold controlled by `unfoldProgress` (0% -> 100%)
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
  var h = window.innerHeight || 275;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 3));
  renderer.setSize(w, h);
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);

  var maxAniso = renderer.capabilities && renderer.capabilities.getMaxAnisotropy
    ? renderer.capabilities.getMaxAnisotropy()
    : 4;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100);
  camera.position.set(0, 0.18, 6.2);

  scene.add(new THREE.AmbientLight(0xffffff, 1.08));
  var dir1 = new THREE.DirectionalLight(0xffffff, 0.55);
  dir1.position.set(3, 5, 6);
  scene.add(dir1);
  var dir2 = new THREE.DirectionalLight(0xeef6f2, 0.4);
  dir2.position.set(-4, 2, -5);
  scene.add(dir2);

  var disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.85, 0.11, 40),
    new THREE.MeshStandardMaterial({ color: 0x24493e, roughness: 0.85 })
  );
  disc.position.y = -1.62;
  scene.add(disc);

  var root = new THREE.Group();
  scene.add(root);

  var extrudeBody = null;
  var edgeLines = null;
  var frontPlane = null;
  var backPlane = null;
  var standMesh = null;
  var flatStripMesh = null;

  var modelMetrics = { modelW: 2.0, clampedH: 2.4, depth: 0.35 };
  var rotY = 0.25;
  var rotX = 0.06;
  var dragging = false;
  var lastX = 0, lastY = 0;

  function notifyParent(type, extra) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, extra || {})));
    }
  }

  var el = renderer.domElement;
  el.addEventListener('touchstart', function(e) {
    if (e.touches[0]) {
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      notifyParent('dragStart');
    }
  }, { passive: true });
  el.addEventListener('touchmove', function(e) {
    if (!dragging || !e.touches[0]) return;
    var cx = e.touches[0].clientX;
    var cy = e.touches[0].clientY;
    rotY += (cx - lastX) * 0.014;
    rotX = Math.max(-0.75, Math.min(0.75, rotX + (cy - lastY) * 0.009));
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
        ch.material.dispose();
      }
    }
    extrudeBody = null;
    edgeLines = null;
    frontPlane = null;
    backPlane = null;
    standMesh = null;
    flatStripMesh = null;
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
      tex.encoding = THREE.sRGBEncoding;
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

  function applyUnfold(pct) {
    state.unfoldProgress = pct;
    var t = Math.max(0, Math.min(1, pct / 100));
    var faceZ = modelMetrics.depth / 2 + 0.008;

    if (extrudeBody) {
      var foldedVis = t < 0.18;
      extrudeBody.visible = foldedVis;
      if (edgeLines) edgeLines.visible = foldedVis;
      var s = Math.max(0.01, 1 - t * 4);
      extrudeBody.scale.set(1, 1, s);
      if (edgeLines) edgeLines.scale.set(1, 1, s);
    }

    if (frontPlane) {
      var spread = Math.max(0.95, modelMetrics.modelW * 0.58);
      frontPlane.position.set(-spread * t, 0.28 * t, faceZ * (1 - t));
      frontPlane.rotation.y = (1 - t) * 0.0;
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

    disc.visible = t < 0.15;
  }

  function rebuildMesh(cfg) {
    state = cfg;
    makeSharpTexture(cfg.imageUri, false, function(frontTex, aspect) {
      makeSharpTexture(cfg.imageUri, true, function(backTex) {
        disposeGroup(root);

        var modelH = 2.55 * ((cfg.heightCm || 18) / 18);
        var clampedH = Math.max(1.5, Math.min(2.95, modelH));
        var modelW = clampedH * (aspect || 1);
        var depth = Math.max(0.24, ((cfg.depthCm || 2.5) / Math.max(10, cfg.heightCm || 18)) * clampedH * 1.45);
        modelMetrics = { modelW: modelW, clampedH: clampedH, depth: depth };

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
            new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide })
          );
          frontPlane.position.z = faceZ;
          root.add(frontPlane);
        }
        if (backTex) {
          backPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(modelW, clampedH),
            new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide })
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

        applyUnfold(cfg.unfoldProgress || 0);
      });
    });
  }

  var lastUri = '';
  var lastContourLen = 0;

  window.updateStudio3D = function(nextCfg) {
    var needsRebuild =
      nextCfg.imageUri !== lastUri ||
      nextCfg.heightCm !== state.heightCm ||
      nextCfg.edgeColorHex !== state.edgeColorHex ||
      (nextCfg.contour ? nextCfg.contour.length : 0) !== lastContourLen;

    state.includeStand = !!nextCfg.includeStand;
    state.spin = !!nextCfg.spin;
    if (needsRebuild) {
      lastUri = nextCfg.imageUri;
      lastContourLen = nextCfg.contour ? nextCfg.contour.length : 0;
      rebuildMesh(nextCfg);
    } else {
      applyUnfold(nextCfg.unfoldProgress || 0);
    }
  };

  window.setStudioSpin = function(spin) {
    state.spin = !!spin;
  };
  window.resetStudioCam = function() {
    rotY = 0.25;
    rotX = 0.06;
  };

  window.addEventListener('resize', function() {
    var nw = window.innerWidth || 340;
    var nh = window.innerHeight || 275;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });

  lastUri = state.imageUri;
  lastContourLen = state.contour ? state.contour.length : 0;
  rebuildMesh(state);

  function animate() {
    requestAnimationFrame(animate);
    var unfoldT = (state.unfoldProgress || 0) / 100;
    if (unfoldT <= 0.05) {
      if (state.spin && !dragging) rotY += 0.008;
      root.rotation.y = rotY;
      root.rotation.x = rotX;
    } else {
      // Smoothly face viewer squarely as pieces flatten
      root.rotation.y = rotY * (1 - Math.min(1, unfoldT * 1.5));
      root.rotation.x = rotX * (1 - Math.min(1, unfoldT * 1.5));
    }
    renderer.render(scene, camera);
  }
  animate();
})();
</script>
</body>
</html>`;
}
