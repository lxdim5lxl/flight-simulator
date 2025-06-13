// Three.js 기본 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // 하늘색

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 조명
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 100);
scene.add(dirLight);

// 창 크기 변경 대응
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === 활주로 ===
const runwayWidth = 20;
const runwayLength = 200;
const runwayGeo = new THREE.PlaneGeometry(runwayWidth, runwayLength);
const runwayMat = new THREE.MeshPhongMaterial({color: 0x333333});
const runway = new THREE.Mesh(runwayGeo, runwayMat);
runway.rotation.x = -Math.PI / 2;
runway.position.set(0, 0.01, 0);
scene.add(runway);

// === 산 ===
function createMountain(x, z, size, height) {
  const geo = new THREE.PlaneGeometry(size, size, 16, 16);
  for (let i = 0; i < geo.vertices?.length || geo.attributes.position.count; i++) {
    // three.js r125+ uses BufferGeometry
    let y = Math.random() * height;
    if (geo.vertices) {
      geo.vertices[i].z = y;
    } else {
      geo.attributes.position.setY(i, y);
    }
  }
  geo.computeVertexNormals?.();
  const mat = new THREE.MeshPhongMaterial({color: 0x556b2f, flatShading: true, side: THREE.DoubleSide});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  scene.add(mesh);
}
// 산 여러 개 배치
createMountain(-80, -100, 80, 30);
createMountain(100, 80, 100, 40);
createMountain(-120, 120, 60, 25);
createMountain(120, -120, 70, 35);

// === 나무 ===
function createTree(x, z, trunkHeight = 6, crownRadius = 4) {
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1, trunkHeight, 8);
  const trunkMat = new THREE.MeshPhongMaterial({color: 0x8b5a2b});
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, trunkHeight/2, z);

  const crownGeo = new THREE.SphereGeometry(crownRadius, 12, 12);
  const crownMat = new THREE.MeshPhongMaterial({color: 0x228b22});
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.set(x, trunkHeight + crownRadius*0.6, z);

  scene.add(trunk);
  scene.add(crown);
}
// 나무 여러 개 배치
for (let i = 0; i < 15; i++) {
  let x = (Math.random() - 0.5) * 300;
  let z = (Math.random() - 0.5) * 300;
  // 활주로 근처는 피함
  if (Math.abs(x) < 30 && Math.abs(z) < 100) continue;
  createTree(x, z);
}

// === 비행기 ===
function createPlane() {
  const group = new THREE.Group();
  // 동체
  const bodyGeo = new THREE.CylinderGeometry(1, 1, 8, 12);
  const bodyMat = new THREE.MeshPhongMaterial({color: 0xe0e0e0});
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.PI / 2;
  group.add(body);
  // 날개
  const wingGeo = new THREE.BoxGeometry(10, 0.3, 1.2);
  const wingMat = new THREE.MeshPhongMaterial({color: 0x1565c0});
  const wing = new THREE.Mesh(wingGeo, wingMat);
  wing.position.set(0, 0, 0);
  group.add(wing);
  // 꼬리날개
  const tailGeo = new THREE.BoxGeometry(2, 0.2, 0.7);
  const tail = new THREE.Mesh(tailGeo, wingMat);
  tail.position.set(-3.5, 0.5, 0);
  group.add(tail);
  // 수직꼬리날개
  const vtailGeo = new THREE.BoxGeometry(0.2, 1, 0.5);
  const vtail = new THREE.Mesh(vtailGeo, wingMat);
  vtail.position.set(-4, 0.5, 0);
  vtail.rotation.z = Math.PI/2;
  group.add(vtail);
  // 조종석
  const cockpitGeo = new THREE.SphereGeometry(1, 8, 8);
  const cockpitMat = new THREE.MeshPhongMaterial({color: 0x90caf9, transparent: true, opacity: 0.7});
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(2, 0.7, 0);
  group.add(cockpit);
  return group;
}

const plane = createPlane();
plane.position.set(0, 2, -runwayLength/2 + 10);
scene.add(plane);

// === 비행기 조작 ===
let velocity = 0.7;
const minVelocity = 0.2;
const maxVelocity = 3.5;
let pitch = 0, yaw = 0, roll = 0;
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

let crashed = false;
let crashTimer = 0;

function respawnPlane() {
  plane.position.set(0, 2, -runwayLength/2 + 10);
  plane.rotation.set(0, 0, 0);
  velocity = 0.7;
  crashed = false;
}

function updatePlane() {
  if (crashed) return;
  // 조작 입력
  const pitchSpeed = 0.012;
  const rollSpeed = 0.022;
  const accel = 0.012;
  const decel = 0.018;

  // 속도 조절 (W/S)
  if (keys['KeyW']) velocity += accel;
  if (keys['KeyS']) velocity -= decel;
  velocity = Math.max(minVelocity, Math.min(maxVelocity, velocity));

  // 롤(좌우 기울이기) 조절 (A/D)
  roll = 0;
  if (keys['KeyA']) roll = rollSpeed;
  else if (keys['KeyD']) roll = -rollSpeed;

  // pitch(상하 각도) 조절 (스페이스/쉬프트)
  pitch = 0;
  if (keys['Space']) pitch = -pitchSpeed; // 위로
  if (keys['ShiftLeft'] || keys['ShiftRight']) pitch = pitchSpeed; // 아래로

  // 요우(방향) 조작은 비활성화, 대신 롤에 따라 자동으로 요우 변화
  // 롤이 클수록 더 많이 방향이 바뀜
  yaw = -plane.rotation.z * 0.045 * (velocity / maxVelocity);

  // 회전 적용
  plane.rotation.x += pitch * (0.5 + velocity / maxVelocity); // 속도 빠를수록 피치 효과 커짐
  plane.rotation.y += yaw;
  plane.rotation.z += roll;

  // 전진
  const dir = new THREE.Vector3(1, 0, 0);
  dir.applyEuler(plane.rotation);
  plane.position.add(dir.multiplyScalar(velocity));

  // 지면 충돌 판정
  if (plane.position.y < 2) {
    crashed = true;
    crashTimer = 60; // 1초 후 리스폰
  }
}

// === 카메라 추적 ===
function updateCamera() {
  // 비행기 뒤쪽 위에서 따라감
  const camOffset = new THREE.Vector3(-18, 8, 0);
  camOffset.applyEuler(plane.rotation);
  const camPos = plane.position.clone().add(camOffset);
  camera.position.lerp(camPos, 0.15);
  camera.lookAt(plane.position);
}

function updateHUD() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const speed = velocity.toFixed(2);
  const altitude = plane.position.y.toFixed(1);
  let msg = `속도: ${speed}<br>고도: ${altitude}`;
  if (crashed) msg += '<br><span style="color:#ff5252">충돌! 재시작...</span>';
  hud.innerHTML = msg;
}

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);
  if (crashed) {
    crashTimer--;
    if (crashTimer <= 0) respawnPlane();
  }
  updatePlane();
  updateCamera();
  updateHUD();
  renderer.render(scene, camera);
}
animate(); 