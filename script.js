// ===== CARS DATA =====
const CARS = [
    { id: 0, name: "McLaren 720S", brand: "McLaren", class: "HYPERCAR", color: 0xff4400, accel: 95, speed: 98, handling: 90, brake: 88 },
    { id: 1, name: "Ferrari SF90", brand: "Ferrari", class: "HYPERCAR", color: 0xcc0000, accel: 97, speed: 96, handling: 88, brake: 90 },
    { id: 2, name: "Lamborghini Huracán", brand: "Lamborghini", class: "SUPER", color: 0x00aa44, accel: 93, speed: 94, handling: 92, brake: 87 },
    { id: 3, name: "Porsche 911 GT3", brand: "Porsche", class: "SPORT", color: 0x2255ff, accel: 88, speed: 90, handling: 98, brake: 95 },
    { id: 4, name: "BMW M4 Competition", brand: "BMW", class: "SPORT", color: 0x222222, accel: 85, speed: 88, handling: 94, brake: 90 },
    { id: 5, name: "Mercedes AMG GT", brand: "Mercedes", class: "PREMIUM", color: 0xc0c0c0, accel: 87, speed: 91, handling: 89, brake: 92 },
    { id: 6, name: "Audi R8 V10", brand: "Audi", class: "SUPER", color: 0xeeeeee, accel: 90, speed: 92, handling: 91, brake: 89 },
    { id: 7, name: "Nissan GT-R", brand: "Nissan", class: "SPORT", color: 0x445566, accel: 92, speed: 89, handling: 86, brake: 85 },
    { id: 8, name: "Toyota Supra", brand: "Toyota", class: "SPORT", color: 0xff6600, accel: 84, speed: 86, handling: 90, brake: 88 },
    { id: 9, name: "Cadillac Escalade", brand: "Cadillac", class: "SUV", color: 0x1a1a2e, accel: 60, speed: 70, handling: 55, brake: 65 }
];

// ===== STATE =====
let selectedCar = 0;
let selectedTrack = 'city';
let scene, camera, renderer, clock;
let player, aiCars = [];
let track = [];
let keys = {};
let gameRunning = false;
let paused = false;
let nitro = 100;
let raceStartTime = 0;
let currentLap = 1;
let totalLaps = 3;
let checkpoints = [];
let nextCheckpoint = 0;
let cameraMode = 0; // 0=chase, 1=hood, 2=cinematic
let trackData = null;

// ===== INIT =====
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loading').classList.add('hide');
        initGarage();
        initThree();
        detectMobile();
    }, 2000);
});

// ===== SCREENS =====
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    if (id === 'garage') updateGarageUI();
}

// ===== GARAGE =====
function initGarage() {
    const list = document.getElementById('carList');
    list.innerHTML = CARS.map((c, i) => `
        <div class="car-item ${i === 0 ? 'active' : ''}" onclick="selectCar(${i})">
            <div class="ci-name">${c.name}</div>
            <div class="ci-brand">${c.brand}</div>
        </div>
    `).join('');
    updateGarageUI();
}

function selectCar(i) {
    selectedCar = i;
    document.querySelectorAll('.car-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === i);
    });
    updateGarageUI();
}

function updateGarageUI() {
    const c = CARS[selectedCar];
    document.getElementById('previewName').textContent = c.name;
    document.getElementById('previewClass').textContent = c.class;
    document.getElementById('statAccel').style.width = c.accel + '%';
    document.getElementById('statSpeed').style.width = c.speed + '%';
    document.getElementById('statHandling').style.width = c.handling + '%';
    document.getElementById('statBrake').style.width = c.brake + '%';
}

function selectTrack(t) {
    selectedTrack = t;
    document.querySelectorAll('.track-card').forEach(el => {
        el.classList.toggle('active', el.dataset.track === t);
    });
}

// ===== THREE.JS SETUP =====
function initThree() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, 15);

    // Lights
    const ambient = new THREE.AmbientLight(0x334455, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 300;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);

    const hemi = new THREE.HemisphereLight(0x4488ff, 0x224422, 0.4);
    scene.add(hemi);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Input
    window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyC') cameraMode = (cameraMode + 1) % 3; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    // Mobile buttons
    setupMobileControls();

    animate();
}

// ===== BUILD TRACK =====
function buildTrack(type) {
    // Clear old
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    
    // Re-add lights
    const ambient = new THREE.AmbientLight(0x334455, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);
    const hemi = new THREE.HemisphereLight(0x4488ff, 0x222222, 0.3);
    scene.add(hemi);

    // Sky / fog based on track
    if (type === 'city') {
        scene.background = new THREE.Color(0x0a0a1a);
        scene.fog = new THREE.Fog(0x0a0a1a, 80, 400);
        // Ground
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        // Buildings
        for (let i = 0; i < 60; i++) {
            const h = 10 + Math.random() * 40;
            const w = 4 + Math.random() * 8;
            const geo = new THREE.BoxGeometry(w, h, w);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.6, 0.1, 0.1 + Math.random() * 0.15),
                roughness: 0.8
            });
            const b = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 120;
            b.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
            // Keep off the track ring
            if (Math.abs(dist - 60) > 20) {
                b.castShadow = true;
                scene.add(b);
                // Windows glow
                if (Math.random() > 0.5) {
                    const light = new THREE.PointLight(0xffaa44, 0.3, 15);
                    light.position.copy(b.position);
                    light.position.y = h * 0.7;
                    scene.add(light);
                }
            }
        }
    } else if (type === 'desert') {
        scene.background = new THREE.Color(0x1a1508);
        scene.fog = new THREE.Fog(0x1a1508, 60, 350);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xc2a06a, roughness: 1 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        // Rocks
        for (let i = 0; i < 40; i++) {
            const s = 1 + Math.random() * 4;
            const geo = new THREE.DodecahedronGeometry(s, 0);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8a7040, roughness: 0.9 });
            const rock = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 35 + Math.random() * 100;
            rock.position.set(Math.cos(angle) * dist, s * 0.4, Math.sin(angle) * dist);
            if (Math.abs(dist - 55) > 15) scene.add(rock);
        }
    } else {
        // Mountain
        scene.background = new THREE.Color(0x0c1520);
        scene.fog = new THREE.Fog(0x0c1520, 50, 300);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.95 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        // Trees (cones)
        for (let i = 0; i < 50; i++) {
            const h = 3 + Math.random() * 6;
            const geo = new THREE.ConeGeometry(1.2, h, 6);
            const mat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 });
            const tree = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 90;
            tree.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
            if (Math.abs(dist - 50) > 12) scene.add(tree);
        }
    }

    // Track ring (road)
    const trackRadius = type === 'mountain' ? 50 : (type === 'desert' ? 55 : 60);
    const trackWidth = 12;
    const segments = 64;

    // Road surface
    const roadShape = new THREE.Shape();
    roadShape.absarc(0, 0, trackRadius + trackWidth / 2, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, trackRadius - trackWidth / 2, 0, Math.PI * 2, true);
    roadShape.holes.push(hole);

    const roadGeo = new THREE.ShapeGeometry(roadShape, segments);
    const roadMat = new THREE.MeshStandardMaterial({
        color: type === 'desert' ? 0x333333 : 0x222228,
        roughness: 0.7,
        metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.05;
    road.receiveShadow = true;
    scene.add(road);

    // Road lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < segments; i++) {
        if (i % 2 === 0) continue;
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 0.4) / segments) * Math.PI * 2;
        const points = [];
        for (let j = 0; j <= 4; j++) {
            const a = a1 + (a2 - a1) * (j / 4);
            points.push(new THREE.Vector3(Math.cos(a) * trackRadius, 0.1, Math.sin(a) * trackRadius));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        // Simple box markers instead
        const marker = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.08, 2.5),
            lineMat
        );
        const midA = (a1 + a2) / 2;
        marker.position.set(Math.cos(midA) * trackRadius, 0.1, Math.sin(midA) * trackRadius);
        marker.rotation.y = -midA;
        scene.add(marker);
    }

    // Barriers
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, metalness: 0.3 });
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        // Outer
        const outer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 2.5), barrierMat);
        outer.position.set(Math.cos(a) * (trackRadius + trackWidth / 2 + 0.8), 0.6, Math.sin(a) * (trackRadius + trackWidth / 2 + 0.8));
        outer.rotation.y = -a;
        outer.castShadow = true;
        scene.add(outer);
        // Inner
        if (i % 3 === 0) {
            const inner = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 2), barrierMat);
            inner.position.set(Math.cos(a) * (trackRadius - trackWidth / 2 - 0.6), 0.4, Math.sin(a) * (trackRadius - trackWidth / 2 - 0.6));
            inner.rotation.y = -a;
            scene.add(inner);
        }
    }

    // Checkpoints
    checkpoints = [];
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        checkpoints.push({
            x: Math.cos(a) * trackRadius,
            z: Math.sin(a) * trackRadius,
            angle: a
        });
    }

    trackData = { radius: trackRadius, width: trackWidth };

    // Start/finish line
    const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -4; i <= 4; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.2), 
            new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffffff : 0x111111 }));
        stripe.position.set(trackRadius + i * 1.3 * 0.3, 0.08, 0);
        // Place across track
        const offset = (i / 4) * (trackWidth * 0.4);
        stripe.position.set(trackRadius, 0.08, offset);
        scene.add(stripe);
    }

    return trackRadius;
}

// ===== CREATE CAR MESH =====
function createCarMesh(color, isPlayer = false) {
    const group = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.7
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 4.5), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: 0.75
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2), cabinMat);
    cabin.position.set(0, 1.1, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.4), bodyMat);
    spoiler.position.set(0, 1.15, -2.0);
    group.add(spoiler);
    const spoilerStandL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), bodyMat);
    spoilerStandL.position.set(-0.7, 0.95, -2.0);
    group.add(spoilerStandL);
    const spoilerStandR = spoilerStandL.clone();
    spoilerStandR.position.x = 0.7;
    group.add(spoilerStandR);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
    const positions = [
        [-1.1, 0.4, 1.4], [1.1, 0.4, 1.4],
        [-1.1, 0.4, -1.5], [1.1, 0.4, -1.5]
    ];
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        group.add(wheel);
    });

    // Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.15), lightMat);
    hl1.position.set(-0.7, 0.7, 2.25);
    group.add(hl1);
    const hl2 = hl1.clone();
    hl2.position.x = 0.7;
    group.add(hl2);

    // Taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.1), tailMat);
    tl1.position.set(-0.7, 0.7, -2.25);
    group.add(tl1);
    const tl2 = tl1.clone();
    tl2.position.x = 0.7;
    group.add(tl2);

    if (isPlayer) {
        // Point light for headlights effect
        const pLight = new THREE.PointLight(0xffffee, 0.8, 20);
        pLight.position.set(0, 1, 3);
        group.add(pLight);
    }

    return group;
}

// ===== PLAYER & AI =====
function createPlayer(radius) {
    const c = CARS[selectedCar];
    const mesh = createCarMesh(c.color, true);
    mesh.position.set(radius, 0, 0);
    mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);

    return {
        mesh,
        speed: 0,
        maxSpeed: 0.8 + (c.speed / 100) * 1.4,
        accel: 0.012 + (c.accel / 100) * 0.02,
        handling: 0.025 + (c.handling / 100) * 0.03,
        brakeForce: 0.02 + (c.brake / 100) * 0.025,
        angle: Math.PI / 2,
        nitroActive: false,
        lap: 1,
        checkpoint: 0,
        finished: false,
        finishTime: 0
    };
}

function createAI(radius, index) {
    const carIdx = (selectedCar + 1 + index) % CARS.length;
    const c = CARS[carIdx];
    const mesh = createCarMesh(c.color, false);
    const offsetAngle = (index + 1) * 0.12;
    const startAngle = Math.PI / 2 + offsetAngle;
    mesh.position.set(
        Math.cos(startAngle - Math.PI / 2) * radius,
        0,
        Math.sin(startAngle - Math.PI / 2) * radius
    );
    mesh.rotation.y = startAngle;
    scene.add(mesh);

    const diff = document.getElementById('difficulty')?.value || 'medium';
    const skillMult = diff === 'easy' ? 0.7 : diff === 'hard' ? 0.95 : 0.85;

    return {
        mesh,
        speed: 0,
        maxSpeed: (0.7 + (c.speed / 100) * 1.2) * skillMult,
        accel: (0.01 + (c.accel / 100) * 0.015) * skillMult,
        handling: 0.02 + (c.handling / 100) * 0.025,
        angle: startAngle,
        targetAngle: startAngle,
        lap: 1,
        checkpoint: 0,
        finished: false,
        finishTime: 0,
        skill: skillMult
    };
}

// ===== START GAME =====
function startGame() {
    showScreen('none');
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('hud').classList.remove('hidden');

    const radius = buildTrack(selectedTrack);
    player = createPlayer(radius);
    aiCars = [];
    for (let i = 0; i < 3; i++) {
        aiCars.push(createAI(radius, i));
    }

    currentLap = 1;
    nextCheckpoint = 1;
    nitro = 100;
    raceStartTime = performance.now();
    gameRunning = true;
    paused = false;
    cameraMode = 0;

    // Countdown feel
    player.speed = 0;
}

// ===== GAME LOOP =====
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (gameRunning && !paused && player) {
        updatePlayer(dt);
        updateAI(dt);
        updateCamera();
        updateHUD();
        updateMinimap();
        checkCheckpoints();
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function updatePlayer(dt) {
    const accelerating = keys['KeyW'] || keys['ArrowUp'];
    const braking = keys['KeyS'] || keys['ArrowDown'];
    const left = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];
    const nitroKey = keys['ShiftLeft'] || keys['ShiftRight'];

    // Nitro
    if (nitroKey && nitro > 0 && accelerating) {
        player.nitroActive = true;
        nitro = Math.max(0, nitro - 30 * dt);
        player.speed += player.accel * 2.2 * dt * 60;
    } else {
        player.nitroActive = false;
        if (nitro < 100) nitro = Math.min(100, nitro + 8 * dt);
    }

    if (accelerating) {
        player.speed += player.accel * dt * 60;
    } else if (braking) {
        player.speed -= player.brakeForce * dt * 60;
    } else {
        player.speed *= 0.98;
    }

    player.speed = Math.max(-player.maxSpeed * 0.3, Math.min(player.maxSpeed * (player.nitroActive ? 1.35 : 1), player.speed));

    // Steering (more effective at speed)
    const steerFactor = Math.min(Math.abs(player.speed) / 0.3, 1);
    if (left) player.angle += player.handling * steerFactor * dt * 60;
    if (right) player.angle -= player.handling * steerFactor * dt * 60;

    // Move
    player.mesh.position.x += Math.sin(player.angle) * player.speed;
    player.mesh.position.z += Math.cos(player.angle) * player.speed;
    player.mesh.rotation.y = player.angle;

    // Keep on track roughly (soft boundary)
    if (trackData) {
        const dist = Math.sqrt(player.mesh.position.x ** 2 + player.mesh.position.z ** 2);
        const minR = trackData.radius - trackData.width / 2 - 1;
        const maxR = trackData.radius + trackData.width / 2 + 1;
        if (dist < minR || dist > maxR) {
            player.speed *= 0.92; // friction off-track
        }
    }

    // Slight tilt
    player.mesh.rotation.z = (left ? 0.08 : 0) - (right ? 0.08 : 0);
}

function updateAI(dt) {
    if (!trackData) return;
    aiCars.forEach((ai, idx) => {
        if (ai.finished) return;

        // Follow track circle
        const pos = ai.mesh.position;
        const currentAngle = Math.atan2(pos.x, pos.z);
        const targetRadius = trackData.radius + (idx - 1) * 1.5;

        // Desired position ahead
        const lookAhead = 0.15 + ai.speed * 0.5;
        const targetA = currentAngle + lookAhead;
        const tx = Math.sin(targetA) * targetRadius;
        const tz = Math.cos(targetA) * targetRadius;

        // Steer toward target
        const desiredAngle = Math.atan2(tx - pos.x, tz - pos.z);
        let angleDiff = desiredAngle - ai.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        ai.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), ai.handling * dt * 60);

        // Speed
        ai.speed += ai.accel * dt * 60;
        ai.speed = Math.min(ai.speed, ai.maxSpeed);
        // Slow in turns
        if (Math.abs(angleDiff) > 0.3) ai.speed *= 0.97;

        ai.mesh.position.x += Math.sin(ai.angle) * ai.speed;
        ai.mesh.position.z += Math.cos(ai.angle) * ai.speed;
        ai.mesh.rotation.y = ai.angle;
    });
}

function updateCamera() {
    if (!player) return;
    const p = player.mesh.position;
    const a = player.angle;

    if (cameraMode === 0) {
        // Chase
        const dist = 12;
        const height = 5;
        const cx = p.x - Math.sin(a) * dist;
        const cz = p.z - Math.cos(a) * dist;
        camera.position.x += (cx - camera.position.x) * 0.08;
        camera.position.y += (p.y + height - camera.position.y) * 0.08;
        camera.position.z += (cz - camera.position.z) * 0.08;
        camera.lookAt(p.x + Math.sin(a) * 5, p.y + 1, p.z + Math.cos(a) * 5);
    } else if (cameraMode === 1) {
        // Hood
        camera.position.set(
            p.x + Math.sin(a) * 1.5,
            p.y + 1.5,
            p.z + Math.cos(a) * 1.5
        );
        camera.lookAt(
            p.x + Math.sin(a) * 20,
            p.y + 0.5,
            p.z + Math.cos(a) * 20
        );
    } else {
        // Cinematic
        const dist = 18;
        camera.position.x += (p.x + Math.cos(a) * dist - camera.position.x) * 0.03;
        camera.position.y += (p.y + 10 - camera.position.y) * 0.03;
        camera.position.z += (p.z + Math.sin(a) * dist - camera.position.z) * 0.03;
        camera.lookAt(p);
    }
}

// ===== CHECKPOINTS & LAPS =====
function checkCheckpoints() {
    if (!player || !checkpoints.length) return;
    const p = player.mesh.position;
    const cp = checkpoints[nextCheckpoint];
    const dist = Math.sqrt((p.x - cp.x) ** 2 + (p.z - cp.z) ** 2);

    if (dist < 14) {
        nextCheckpoint = (nextCheckpoint + 1) % checkpoints.length;
        if (nextCheckpoint === 0) {
            currentLap++;
            if (currentLap > totalLaps) {
                finishRace();
            }
        }
    }

    // AI checkpoints (simplified)
    aiCars.forEach(ai => {
        if (ai.finished) return;
        const ap = ai.mesh.position;
        const acp = checkpoints[ai.checkpoint];
        const adist = Math.sqrt((ap.x - acp.x) ** 2 + (ap.z - acp.z) ** 2);
        if (adist < 16) {
            ai.checkpoint = (ai.checkpoint + 1) % checkpoints.length;
            if (ai.checkpoint === 0) {
                ai.lap++;
                if (ai.lap > totalLaps) {
                    ai.finished = true;
                    ai.finishTime = performance.now() - raceStartTime;
                }
            }
        }
    });
}

function finishRace() {
    gameRunning = false;
    player.finished = true;
    player.finishTime = performance.now() - raceStartTime;

    // Calculate position
    let pos = 1;
    aiCars.forEach(ai => {
        if (ai.finished && ai.finishTime < player.finishTime) pos++;
        if (!ai.finished) { /* player finished first among remaining */ }
        else if (!ai.finished && ai.lap > currentLap) pos++;
    });

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('resultsPos').textContent = pos + '-o‘rin';
    document.getElementById('resultsTime').textContent = formatTime(player.finishTime);
    document.getElementById('resultsTitle').textContent = pos === 1 ? 'G‘ALABA!' : 'POYGA TUGADI';
}

// ===== HUD =====
function updateHUD() {
    const speedKmh = Math.abs(Math.round(player.speed * 180));
    document.getElementById('speed').textContent = speedKmh;
    document.getElementById('nitroFill').style.width = nitro + '%';
    document.getElementById('lap').textContent = Math.min(currentLap, totalLaps) + '/' + totalLaps;

    const elapsed = performance.now() - raceStartTime;
    document.getElementById('raceTime').textContent = formatTime(elapsed);

    // Position estimate
    let pos = 1;
    aiCars.forEach(ai => {
        if (ai.lap > currentLap) pos++;
        else if (ai.lap === currentLap && ai.checkpoint > nextCheckpoint) pos++;
    });
    document.getElementById('position').textContent = pos;
}

function formatTime(ms) {
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const msPart = Math.floor((ms % 1000));
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(msPart).padStart(3, '0')}`;
}

function updateMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas || !player || !trackData) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);

    const scale = 0.9;
    const cx = w / 2;
    const cy = h / 2;
    const r = (trackData.radius * scale) * (w / 200);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = (trackData.width * scale) * (w / 200);
    ctx.stroke();

    // Player
    const px = cx + player.mesh.position.x * scale * (w / 200);
    const pz = cy + player.mesh.position.z * scale * (w / 200);
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.fill();

    // AI
    aiCars.forEach(ai => {
        const ax = cx + ai.mesh.position.x * scale * (w / 200);
        const az = cy + ai.mesh.position.z * scale * (w / 200);
        ctx.beginPath();
        ctx.arc(ax, az, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff006e';
        ctx.fill();
    });
}

// ===== PAUSE / RESTART =====
function togglePause() {
    if (!gameRunning && !paused) return;
    paused = !paused;
    document.getElementById('pauseMenu').classList.toggle('hidden', !paused);
}

function restartRace() {
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    startGame();
}

function exitToMenu() {
    gameRunning = false;
    paused = false;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    showScreen('mainMenu');
}

// ===== MOBILE =====
function detectMobile() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('mobileControls').classList.remove('hidden');
    }
}

function setupMobileControls() {
    const map = {
        btnLeft: 'ArrowLeft',
        btnRight: 'ArrowRight',
        btnAccel: 'ArrowUp',
        btnBrake: 'ArrowDown',
        btnNitro: 'ShiftLeft'
    };
    Object.entries(map).forEach(([id, code]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', e => { e.preventDefault(); keys[code] = true; });
        btn.addEventListener('touchend', e => { e.preventDefault(); keys[code] = false; });
        btn.addEventListener('mousedown', () => keys[code] = true);
        btn.addEventListener('mouseup', () => keys[code] = false);
        btn.addEventListener('mouseleave', () => keys[code] = false);
    });
}
