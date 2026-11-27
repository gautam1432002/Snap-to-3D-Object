import { ContourPoint } from './sampleTemplates';

export interface ThreeModelPayload {
  imageUri: string;
  contour: ContourPoint[];
  edgeColorHex: string;
  heightCm: number;
  depthCm: number;
  moldStyle: 'block' | 'standee';
  includeStand: boolean;
  spin: boolean;
}

export interface UnfoldPayload {
  imageUri: string;
  edgeColorHex: string;
  includeStand: boolean;
  progress: number;
}

/**
 * Generates self-contained Three.js r128 ExtrudeGeometry HTML for Stage 3 WebView.
 * Accepts live updates via window.updateFoldlyModel(payload) injected from React Native.
 */
export function buildThreeModelHtml(initial: ThreeModelPayload): string {
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
  #host {
    width: 100%;
    height: 100%;
  }
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
  var h = window.innerHeight || 250;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100);
  camera.position.set(0, 0.2, 6.2);

  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  var dir1 = new THREE.DirectionalLight(0xffffff, 0.65);
  dir1.position.set(3, 5, 6);
  scene.add(dir1);
  var dir2 = new THREE.DirectionalLight(0xeef6f2, 0.45);
  dir2.position.set(-4, 2, -5);
  scene.add(dir2);

  var disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.85, 0.12, 36),
    new THREE.MeshStandardMaterial({ color: 0x24493e, roughness: 0.85 })
  );
  disc.position.y = -1.62;
  scene.add(disc);

  var root = new THREE.Group();
  scene.add(root);

  var rotY = 0.25;
  var rotX = 0.06;
  var dragging = false;
  var lastX = 0, lastY = 0;

  function notifyParent(type) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
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
  }

  function makeCanvasTexture(src, mirror, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var cw = Math.max(128, Math.min(512, img.naturalWidth || 420));
      var ch = Math.max(128, Math.min(512, img.naturalHeight || 420));
      var c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      var ctx = c.getContext('2d');
      if (mirror) {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      var tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      tex.needsUpdate = true;
      cb(tex, (img.naturalWidth || 420) / Math.max(1, img.naturalHeight || 420));
    };
    img.onerror = function() {
      cb(null, 1.0);
    };
    img.src = src;
  }

  var lastBuiltUri = '';

  function rebuildMesh(cfg) {
    state = cfg;
    makeCanvasTexture(cfg.imageUri, false, function(frontTex, aspect) {
      makeCanvasTexture(cfg.imageUri, true, function(backTex) {
        disposeGroup(root);
        var modelH = 2.6 * ((cfg.heightCm || 18) / 18);
        var clampedH = Math.max(1.5, Math.min(3.0, modelH));
        var modelW = clampedH * (aspect || 1);
        var depth = cfg.moldStyle === 'standee'
          ? 0.14
          : Math.max(0.22, ((cfg.depthCm || 2.5) / Math.max(10, cfg.heightCm || 18)) * clampedH * 1.45);

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

        var sideMat = new THREE.MeshLambertMaterial({
          color: new THREE.Color(cfg.edgeColorHex || '#2ec4b6')
        });
        root.add(new THREE.Mesh(extrudeGeom, sideMat));

        var edgesGeom = new THREE.EdgesGeometry(extrudeGeom, 24);
        var edgeLines = new THREE.LineSegments(
          edgesGeom,
          new THREE.LineBasicMaterial({ color: 0x17201d, transparent: true, opacity: 0.5 })
        );
        root.add(edgeLines);

        var faceZ = depth / 2 + 0.008;
        if (frontTex) {
          var frontPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(modelW, clampedH),
            new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, alphaTest: 0.15 })
          );
          frontPlane.position.z = faceZ;
          root.add(frontPlane);
        }
        if (backTex) {
          var backPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(modelW, clampedH),
            new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.15 })
          );
          backPlane.position.z = -faceZ;
          backPlane.rotation.y = Math.PI;
          root.add(backPlane);
        }

        if (cfg.includeStand) {
          var standW = Math.max(0.7, modelW * 0.62);
          var standMesh = new THREE.Mesh(
            new THREE.BoxGeometry(standW, 0.06, Math.max(0.55, depth + 0.55)),
            new THREE.MeshLambertMaterial({ color: 0xfdfdfb })
          );
          standMesh.position.y = -clampedH / 2 - 0.04;
          root.add(standMesh);
        }
        lastBuiltUri = cfg.imageUri;
      });
    });
  }

  window.updateFoldlyModel = function(nextCfg) {
    rebuildMesh(nextCfg);
  };
  window.setFoldlySpin = function(spin) {
    state.spin = !!spin;
  };
  window.flipFoldlyModel = function() {
    rotY += Math.PI;
  };
  window.resetFoldlyCam = function() {
    rotY = 0.25;
    rotX = 0.06;
  };

  window.addEventListener('resize', function() {
    var nw = window.innerWidth || 340;
    var nh = window.innerHeight || 250;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });

  rebuildMesh(state);

  function animate() {
    requestAnimationFrame(animate);
    if (state.spin && !dragging) rotY += 0.009;
    root.rotation.y = rotY;
    root.rotation.x = rotX;
    renderer.render(scene, camera);
  }
  animate();
})();
</script>
</body>
</html>`;
}

/**
 * Generates self-contained Three.js r128 3D-to-2D Unfold HTML for Stage 4 WebView.
 */
export function buildUnfoldHtml(initial: UnfoldPayload): string {
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
  }
  #host { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="host"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function() {
  var state = ${safeJson};
  if (typeof THREE === 'undefined') return;

  var host = document.getElementById('host');
  var w = window.innerWidth || 340;
  var h = window.innerHeight || 265;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  camera.position.set(0, 0.3, 6.8);
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));

  var frontM = null, backM = null, stripM = null, standM = null;

  function makeCanvasTexture(src, mirror, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var cw = Math.max(128, Math.min(512, img.naturalWidth || 420));
      var ch = Math.max(128, Math.min(512, img.naturalHeight || 420));
      var c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      var ctx = c.getContext('2d');
      if (mirror) {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      var tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      tex.needsUpdate = true;
      cb(tex, (img.naturalWidth || 420) / Math.max(1, img.naturalHeight || 420));
    };
    img.onerror = function() { cb(null, 1.0); };
    img.src = src;
  }

  function applyProgress(pct) {
    state.progress = pct;
    var t = Math.max(0, Math.min(1, pct / 100));
    if (!frontM) return;

    frontM.position.set(-1.15 * t, 0.35 * t, (1 - t) * 0.35);
    frontM.rotation.y = (1 - t) * 0.35;

    backM.position.set(1.15 * t, 0.35 * t, -(1 - t) * 0.35);
    backM.rotation.y = Math.PI * (1 - t);

    stripM.position.set(0, -1.05 * t, 0);
    stripM.rotation.x = (1 - t) * (Math.PI / 2);

    standM.visible = !!state.includeStand;
    standM.position.set(0, -1.62 * t, 0);
    standM.rotation.x = (1 - t) * (Math.PI / 2);

    renderer.render(scene, camera);
  }

  function buildMeshes(cfg) {
    state = cfg;
    [frontM, backM, stripM, standM].forEach(function(m) {
      if (m) {
        scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
    });

    makeCanvasTexture(cfg.imageUri, false, function(fTex, aspect) {
      makeCanvasTexture(cfg.imageUri, true, function(bTex) {
        var ph = 2.0;
        var pw = Math.min(2.2, ph * (aspect || 1));

        frontM = new THREE.Mesh(
          new THREE.PlaneGeometry(pw, ph),
          new THREE.MeshBasicMaterial({ map: fTex, transparent: true, side: THREE.DoubleSide })
        );
        backM = new THREE.Mesh(
          new THREE.PlaneGeometry(pw, ph),
          new THREE.MeshBasicMaterial({ map: bTex, transparent: true, side: THREE.DoubleSide })
        );
        stripM = new THREE.Mesh(
          new THREE.PlaneGeometry(3.4, 0.42),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.edgeColorHex || '#2ec4b6'), side: THREE.DoubleSide })
        );
        standM = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1, 0.55),
          new THREE.MeshBasicMaterial({ color: 0xfdfdfb, side: THREE.DoubleSide })
        );

        scene.add(frontM, backM, stripM, standM);
        applyProgress(state.progress || 0);
      });
    });
  }

  window.setUnfoldProgress = applyProgress;
  window.updateUnfoldConfig = function(cfg) {
    state.includeStand = !!cfg.includeStand;
    state.edgeColorHex = cfg.edgeColorHex || state.edgeColorHex;
    if (stripM) stripM.material.color = new THREE.Color(state.edgeColorHex);
    applyProgress(cfg.progress !== undefined ? cfg.progress : state.progress);
  };

  var animId = null;
  window.replayUnfold = function() {
    if (animId) cancelAnimationFrame(animId);
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / 1400);
      var eased = 1 - Math.pow(1 - t, 3);
      applyProgress(eased * 100);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'progress', value: Math.round(eased * 100) }));
      }
      if (t < 1) animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);
  };

  window.addEventListener('resize', function() {
    var nw = window.innerWidth || 340;
    var nh = window.innerHeight || 265;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
    renderer.render(scene, camera);
  });

  buildMeshes(state);
})();
</script>
</body>
</html>`;
}
