import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// A procedural garment: no external model request is needed for the scene.
// ScrollTrigger writes camera poses into motionState without React frame updates.
export default function GarmentScene({ motionState, edition, onReady, reduced }) {
  const host = useRef(), editionRef = useRef(edition);
  editionRef.current = edition;
  useEffect(() => {
    const el = host.current;
    if (!el || reduced) return;
    const canvas = document.createElement('canvas');
    let gl;
    try { gl = canvas.getContext('webgl2', { alpha: true, antialias: true }); } catch { return; }
    if (!gl) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
    camera.position.set(0, .05, 7.6);
    const garment = new THREE.Group(); scene.add(garment);
    scene.add(new THREE.HemisphereLight(0xf7f5ee, 0x24252b, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 6); key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbdd1e9, 2.8); fill.position.set(3, 0, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff201a, 5); rim.position.set(2, 1, -2); scene.add(rim);
    const geometries = [], materials = [], textures = [];
    const weave = document.createElement('canvas'); weave.width = weave.height = 256;
    const ctx = weave.getContext('2d'); ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 3) for (let x = 0; x < 256; x += 3) {
      const shade = 100 + Math.floor((Math.sin(x * 12.9 + y * 7.4) + 1) * 30);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`; ctx.fillRect(x, y, 2, 1);
    }
    const texture = new THREE.CanvasTexture(weave); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4); textures.push(texture);
    const fabric = new THREE.MeshPhysicalMaterial({ color: 0x191b1e, roughness: .55, metalness: .08, bumpMap: texture, bumpScale: .008, sheen: .8, sheenRoughness: .7, sheenColor: 0x777b85, side: THREE.DoubleSide });
    const ribbed = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: .86, bumpMap: texture, bumpScale: .018, side: THREE.DoubleSide });
    const trim = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .3, metalness: .75 });
    const red = new THREE.MeshStandardMaterial({ color: 0xad1c23, roughness: .5 });
    const ivory = new THREE.MeshStandardMaterial({ color: 0xe8e5df, roughness: .6 });
    materials.push(fabric, ribbed, trim, red, ivory);
    function mesh(geometry, material) { geometries.push(geometry); const object = new THREE.Mesh(geometry, material); garment.add(object); return object; }
    function surface(rows, cols, shape, material) {
      const vertices = [], uv = [], indices = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { vertices.push(...shape(j / rows, i / cols)); uv.push(i / cols, j / rows); }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + cols + 1; indices.push(a, a + 1, b, b, a + 1, b + 1); }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return mesh(geometry, material);
    }
    const profiles = [[0, .52, .25], [.12, .56, .29], [.45, .59, .31], [.72, .65, .29], [.87, .71, .24], [1, .32, .22]];
    const radius = (t, component) => { let i = 0; while (i < profiles.length - 2 && t > profiles[i + 1][0]) i++; const a = profiles[i], b = profiles[i + 1], q = (t - a[0]) / (b[0] - a[0]); return a[component] + (b[component] - a[component]) * (q * q * (3 - 2 * q)); };
    surface(60, 80, (v, u) => {
      const a = u * Math.PI * 2;
      const fold = (Math.sin(v * 28 + a * 5) + Math.sin(v * 46 - a * 3) * .3) * .013 * Math.sin(v * Math.PI);
      return [Math.sin(a) * (radius(v, 1) + fold), -1.05 + v * 2.02, Math.cos(a) * (radius(v, 2) + fold) + Math.sin(v * 9) * .015];
    }, fabric);
    for (const side of [-1, 1]) {
      surface(48, 40, (v, u) => {
        const a = u * Math.PI * 2, x = side * (.62 + .44 * v), y = .67 - 1.72 * v, z = -.015 + Math.sin(v * Math.PI) * .04;
        const r = .235 * (1 - v) + .145 * v + (Math.sin(v * 36 + u * 4) * .017 + Math.cos(v * 21 - u * 3) * .013) * Math.sin(v * Math.PI);
        return [x + Math.cos(a) * r, y + Math.cos(a) * r * .2, z + Math.sin(a) * r * .86];
      }, fabric);
      surface(9, 40, (v, u) => { const a = u * Math.PI * 2, r = .145 + Math.sin(u * Math.PI * 90) * .002; return [side * 1.06 + Math.cos(a) * r, -1.04 - v * .17 + Math.cos(a) * r * .2, Math.sin(a) * r * .86]; }, ribbed);
      const piping = [], pocket = [];
      for (let j = 0; j <= 42; j++) { const v = j / 42; piping.push(new THREE.Vector3(side * (.62 + .44 * v + .12), .73 - 1.73 * v, .125)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(piping), 50, .008, 6, false), red);
      for (let i = 0; i <= 12; i++) { const t = i / 12; pocket.push(new THREE.Vector3(side * (.35 + .11 * t), -.28 - .35 * t, .294)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pocket), 16, .014, 6, false), trim);
    }
    surface(10, 64, (v, u) => { const a = u * Math.PI * 2; return [Math.sin(a) * (.26 + v * .015), .92 + v * .27, Math.cos(a) * (.207 + v * .01)]; }, fabric);
    surface(8, 64, (v, u) => { const a = u * Math.PI * 2, r = .515 + Math.sin(u * 90 * Math.PI) * .002; return [Math.sin(a) * r, -1.06 - v * .12, Math.cos(a) * .25]; }, ribbed);
    const zip = [];
    for (let i = 0; i <= 60; i++) { const v = i / 60; zip.push(new THREE.Vector3(0, -1.13 + v * 2.31, radius(Math.min(1, Math.max(0, (v * 2.31 - .08) / 2.02)), 2) + .022)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zip), 90, .009, 6, false), trim);
    const teethGeometry = new THREE.BoxGeometry(.025, .008, .015); geometries.push(teethGeometry);
    const teeth = new THREE.InstancedMesh(teethGeometry, trim, 85), matrix = new THREE.Object3D();
    for (let i = 0; i < 85; i++) { const v = i / 84; matrix.position.set(0, -1.05 + v * 2.19, radius(v, 2) + .026); matrix.updateMatrix(); teeth.setMatrixAt(i, matrix.matrix); } garment.add(teeth);
    const pull = mesh(new THREE.BoxGeometry(.037, .11, .025), trim); pull.position.set(0, 1.08, .25);
    const badge = mesh(new THREE.PlaneGeometry(.14, .095), ivory); badge.position.set(.32, .53, .316); badge.rotation.z = -.08;
    const slash = mesh(new THREE.PlaneGeometry(.025, .11), red); slash.position.set(.33, .53, .318); slash.rotation.z = -.4;

    let active = true, visible = true, frame = 0, drag = 0, lastX = 0, down = false, initial = true;
    const pointerDown = e => { down = true; lastX = e.clientX; };
    const pointerMove = e => { if (down) { drag += (e.clientX - lastX) * .008; lastX = e.clientX; } };
    const pointerUp = () => { down = false; };
    el.addEventListener('pointerdown', pointerDown); window.addEventListener('pointermove', pointerMove); window.addEventListener('pointerup', pointerUp); window.addEventListener('pointercancel', pointerUp);
    const resize = () => { if (!el.clientHeight || !el.clientWidth) return; renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(el); resize();
    const targetColor = new THREE.Color();
    function tick(time) {
      if (!active) return;
      const s = motionState.current; targetColor.set(editionRef.current.color); fabric.color.lerp(targetColor, .08);
      garment.rotation.y = s.rotation + drag + Math.sin(time * .00045) * .035;
      garment.rotation.z = s.tilt; garment.position.set(s.x, s.y + Math.sin(time * .00065) * .025, 0); garment.scale.setScalar(s.scale);
      rim.intensity = editionRef.current.id === 'chalk' ? 1.8 : 5;
      renderer.render(scene, camera);
      if (initial) { initial = false; onReady(); }
      frame = requestAnimationFrame(tick);
    }
    const resume = () => { active = visible && !document.hidden; cancelAnimationFrame(frame); if (active) frame = requestAnimationFrame(tick); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); }, { rootMargin: '100px' }); observer.observe(el);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false; cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', resume);
      el.removeEventListener('pointerdown', pointerDown); window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', pointerUp); window.removeEventListener('pointercancel', pointerUp);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); el.replaceChildren();
    };
  }, [reduced, onReady]);
  return <div className="garment-canvas" ref={host} aria-hidden="true"/>;
}
