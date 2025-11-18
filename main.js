// ============================================================================
// SAILING GAME - Complete Redesign
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    boat: {
        speed: 0.5,
        maneuverDistance: 80,
        roundingRadius: 25,
        finishClearance: 200
    },
    camera: {
        fov: 50,
        near: 0.1,
        far: 2000
    },
    course: {
        start: { x: 450, y: 550 },
        leewardGate1: { x: 400, y: 400 },
        leewardGate2: { x: 500, y: 400 },
        windwardMark: { x: 450, y: 100 },
        finish: { x: 450, y: 550 }
    },
    legSequence: [
        { name: "Upwind 1", target: "windwardMark", isUpwind: true },
        { name: "Downwind 1", target: "leewardGate1", isUpwind: false },
        { name: "Upwind 2", target: "windwardMark", isUpwind: true },
        { name: "Downwind 2", target: "finish", isUpwind: false },
        { name: "Upwind 3", target: "finish", isUpwind: true }
    ]
};

// ============================================================================
// GAME STATE
// ============================================================================
const game = {
    scene: null,
    camera: null,
    renderer: null,
    boat: {
        x: 0,
        y: 0,
        z: 0,
        angle: 0,
        direction: -1, // -1 = starboard, 1 = port
        mesh: null
    },
    water: null,
    currentLegIndex: -1, // -1 = Start leg
    legManeuverIndex: 0,
    distanceSinceLastManeuver: 0,
    isMoving: false,
    gameComplete: false,
    gatePhase: null, // null, "between", "rounding", "upwind"
    gateMarkTarget: null,
    hasFinishedOnce: false,
    allManeuversComplete: false,
    boatExiting: false,
    crossingStartLine: false,
    previousLeg: null // Track previous leg for animation transitions
};

// ============================================================================
// MANEUVERS DATA
// ============================================================================
const maneuversData = [
    { leg: "Start", type: "Start", number: 1, text: "START LINE: Ilya started coding simple games as a kid as his hobby" },

    { leg: "Upwind 1", type: "Tack", number: 1, text: "LEG 1: Technology and Marketing Background" },
    { leg: "Upwind 1", type: "Tack", number: 2, text: "Hobby became a profession when Ilya got MSc in Computer Science" },
    { leg: "Upwind 1", type: "Tack", number: 3, text: "Changing tacks years later he got a Bachelor's degree in Marketing and Strategy" },
    { leg: "Upwind 1", type: "Tack", number: 4, text: "Worked for 11 years for big corp (Nokia, Microsoft)" },
    { leg: "Upwind 1", type: "Tack", number: 5, text: "Then changed tack again for 6 years as an independent consultant" },
    { leg: "Upwind 1", type: "Tack", number: 6, text: "Currently working as a product architect in a fintech startup" },

    { leg: "Downwind 1", type: "Gybe", number: 1, text: "LEG 2: Sailing, Umpiring and World Sailing Experience" },
    { leg: "Downwind 1", type: "Gybe", number: 2, text: "Ilya started sailing and racing as an adult in 2008" },
    { leg: "Downwind 1", type: "Gybe", number: 3, text: "With keen interest in match racing he decided to learn umpiring" },
    { leg: "Downwind 1", type: "Gybe", number: 4, text: "Was appointed as an International Umpire since 2019..." },
    { leg: "Downwind 1", type: "Gybe", number: 5, text: "...and currently pursuing an International Judge appointment" },
    { leg: "Downwind 1", type: "Gybe", number: 6, text: "From 2025 a member of the IUSC Umpire Documents Working Group" },
    { leg: "Downwind 1", type: "Gybe", number: 7, text: "After work hours coaching adult sailors in a local sailing club" },

    { leg: "Upwind 2", type: "Tack", number: 1, text: "LEG 3: eSailing Community Involvement" },
    { leg: "Upwind 2", type: "Tack", number: 2, text: "Ilya started playing Hydrofoil Generation sim game a couple of years ago" },
    { leg: "Upwind 2", type: "Tack", number: 3, text: "Naturally got involved in a discord community around the game" },
    { leg: "Upwind 2", type: "Tack", number: 4, text: "The community started an unofficial, grass-root SailGP-like league early 2025" },
    { leg: "Upwind 2", type: "Tack", number: 5, text: "...and Ilya joined as an umpire for all 7 events" },
    { leg: "Upwind 2", type: "Tack", number: 6, text: "For 2026 season will be helping the community with OA/Race Management/Umpire" },
    { leg: "Upwind 2", type: "Tack", number: 7, text: "Excited for 13 events next year and preparing format, scoring system, rules, NoR, SI, etc" },

    { leg: "Downwind 2", type: "Gybe", number: 1, text: "LEG 4: Motivation for eSailing Commission" },
    { leg: "Downwind 2", type: "Gybe", number: 2, text: "After a year in our Discord community I see so much value in eSailing" },
    { leg: "Downwind 2", type: "Gybe", number: 3, text: "Group have Nacra 17 Olympic Sailors and the AC e-Series winner/finalists..." },
    { leg: "Downwind 2", type: "Gybe", number: 4, text: "... playing alongside with regular club sailors and sim enthusiasts" },
    { leg: "Downwind 2", type: "Gybe", number: 5, text: "All ages across the globe improve the skills, learn rules and have fun" },
    { leg: "Downwind 2", type: "Gybe", number: 6, text: "Opportunities for inclusivity and balanced gender representation are there." },
    { leg: "Downwind 2", type: "Gybe", number: 7, text: "FINISH LINE: WS can advance benefits and excitement of eSailing, and I would love to be a part of it" },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function normalizeAngle(angle) {
    return ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
}

function getAngleToPoint(fromX, fromZ, toX, toY) {
    return Math.atan2(toY - fromZ, toX - fromX);
}

// ============================================================================
// MANEUVER MANAGEMENT
// ============================================================================
function getCurrentLegManeuvers() {
    if (game.currentLegIndex < 0) {
        return maneuversData.filter(m => m.leg === "Start");
    }
    const currentLeg = CONFIG.legSequence[game.currentLegIndex];
    if (!currentLeg) return [];
    return maneuversData.filter(m => m.leg === currentLeg.name);
}

function getNextManeuver() {
    const legManeuvers = getCurrentLegManeuvers();
    if (game.legManeuverIndex < legManeuvers.length) {
        const maneuver = legManeuvers[game.legManeuverIndex];
        game.legManeuverIndex++;
        return maneuver;
    }
    return null;
}

function hasMoreManeuvers() {
    return game.legManeuverIndex < getCurrentLegManeuvers().length;
}

function areAllManeuversComplete() {
    // Count total maneuvers completed across all legs
    let totalManeuvers = 0;
    let totalCompleted = 0;
    
    // Count all maneuvers (excluding Start)
    const allManeuvers = maneuversData.filter(m => m.leg !== "Start");
    totalManeuvers = allManeuvers.length;
    
    // Count completed maneuvers
    for (let i = 0; i < CONFIG.legSequence.length; i++) {
        const leg = CONFIG.legSequence[i];
        const legManeuvers = maneuversData.filter(m => m.leg === leg.name);
        
        if (i < game.currentLegIndex) {
            totalCompleted += legManeuvers.length;
        } else if (i === game.currentLegIndex) {
            totalCompleted += game.legManeuverIndex;
        }
    }
    
    return totalCompleted >= totalManeuvers;
}

// ============================================================================
// 3D SCENE INITIALIZATION
// ============================================================================
function init3D() {
    const container = document.getElementById('gameContainer');
    if (!container) {
        console.error('gameContainer not found');
        return;
    }

    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width || 900;
    const height = containerRect.height || 600;

    // Scene
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x87CEEB);

    // Camera
    game.camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        width / height,
        CONFIG.camera.near,
        CONFIG.camera.far
    );
    updateCameraPosition();

    // Renderer
    game.renderer = new THREE.WebGLRenderer({ antialias: true });
    game.renderer.setSize(width, height);
    game.renderer.shadowMap.enabled = true;
    game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(game.renderer.domElement);

    window.addEventListener('resize', handleResize);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    game.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 500, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 2000;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    game.scene.add(directionalLight);

    createWater();
    createCourseMarkers();
    createBoat();
}

function handleResize() {
    const container = document.getElementById('gameContainer');
    if (!container || !game.camera || !game.renderer) return;

    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    game.camera.aspect = width / height;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(width, height);
    updateCameraPosition();
}

function updateCameraPosition() {
    if (!game.camera) return;
    
    const course = CONFIG.course;
    const minX = Math.min(course.start.x, course.leewardGate1.x, course.leewardGate2.x, course.windwardMark.x) - 50;
    const maxX = Math.max(course.start.x, course.leewardGate1.x, course.leewardGate2.x, course.windwardMark.x) + 50;
    const minZ = Math.min(course.start.y, course.leewardGate1.y, course.leewardGate2.y, course.windwardMark.y) - 30;
    const maxZ = Math.max(course.start.y, course.leewardGate1.y, course.leewardGate2.y, course.windwardMark.y) + 30;
    
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const courseWidth = maxX - minX;
    const courseHeight = maxZ - minZ;
    
    const fov = CONFIG.camera.fov * (Math.PI / 180);
    const aspect = game.camera ? game.camera.aspect : 1.5;
    const distanceX = (courseWidth / 2) / Math.tan(fov / 2) / aspect;
    const distanceZ = (courseHeight / 2) / Math.tan(fov / 2);
    const distance = Math.max(distanceX, distanceZ) * 1.1;
    
    game.camera.position.set(centerX, distance * 0.6, centerZ + distance);
    game.camera.lookAt(centerX, 0, centerZ);
}

// ============================================================================
// 3D OBJECTS CREATION
// ============================================================================
function createWater() {
    const course = CONFIG.course;
    const minX = Math.min(course.start.x, course.leewardGate1.x, course.leewardGate2.x, course.windwardMark.x);
    const maxX = Math.max(course.start.x, course.leewardGate1.x, course.leewardGate2.x, course.windwardMark.x);
    const minZ = Math.min(course.start.y, course.leewardGate1.y, course.leewardGate2.y, course.windwardMark.y);
    const maxZ = Math.max(course.start.y, course.leewardGate1.y, course.leewardGate2.y, course.windwardMark.y);
    
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const courseWidth = maxX - minX;
    const courseHeight = maxZ - minZ;
    
    const waterSize = Math.max(courseWidth, courseHeight) * 3;
    const geometry = new THREE.PlaneGeometry(waterSize, waterSize, 50, 50);
    const material = new THREE.MeshStandardMaterial({
        color: 0x4682B4,
        roughness: 0.8,
        metalness: 0.2
    });
    game.water = new THREE.Mesh(geometry, material);
    game.water.rotation.x = -Math.PI / 2;
    game.water.position.set(centerX, 0, centerZ);
    game.water.receiveShadow = true;
    game.scene.add(game.water);
}

function createCourseMarkers() {
    // Start/Finish line
    const startGroup = new THREE.Group();
    const lineGeometry = new THREE.BoxGeometry(100, 8, 3);
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00 });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, 4, 0);
    line.castShadow = true;
    startGroup.add(line);

    const postGeometry = new THREE.CylinderGeometry(2, 2, 20, 8);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
    leftPost.position.set(-50, 10, 0);
    leftPost.castShadow = true;
    startGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
    rightPost.position.set(50, 10, 0);
    rightPost.castShadow = true;
    startGroup.add(rightPost);

    startGroup.position.set(CONFIG.course.start.x, 0, CONFIG.course.start.y);
    game.scene.add(startGroup);

    // Windward mark
    const windwardGroup = new THREE.Group();
    const baseGeometry = new THREE.CylinderGeometry(8, 10, 5, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 2.5;
    base.castShadow = true;
    windwardGroup.add(base);

    const coneGeometry = new THREE.ConeGeometry(12, 35, 8);
    const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = 20;
    cone.castShadow = true;
    windwardGroup.add(cone);

    const ballGeometry = new THREE.SphereGeometry(6, 8, 8);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.y = 40;
    ball.castShadow = true;
    windwardGroup.add(ball);

    windwardGroup.position.set(CONFIG.course.windwardMark.x, 0, CONFIG.course.windwardMark.y);
    game.scene.add(windwardGroup);

    // Leeward gate markers
    [CONFIG.course.leewardGate1, CONFIG.course.leewardGate2].forEach((gate) => {
        const gateGroup = new THREE.Group();
        const gateBase = new THREE.Mesh(baseGeometry, baseMaterial);
        gateBase.position.y = 2.5;
        gateBase.castShadow = true;
        gateGroup.add(gateBase);

        const gateCone = new THREE.Mesh(
            new THREE.ConeGeometry(10, 28, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00 })
        );
        gateCone.position.y = 16;
        gateCone.castShadow = true;
        gateGroup.add(gateCone);

        gateGroup.position.set(gate.x, 0, gate.y);
        game.scene.add(gateGroup);
    });
}

function createBoat() {
    const boatGroup = new THREE.Group();

    // Hull
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-20, 0);
    hullShape.quadraticCurveTo(-15, -15, -8, -30);
    hullShape.lineTo(-3, -45);
    hullShape.lineTo(0, -50);
    hullShape.lineTo(3, -45);
    hullShape.lineTo(8, -30);
    hullShape.quadraticCurveTo(15, -15, 20, 0);
    hullShape.quadraticCurveTo(15, 15, 8, 30);
    hullShape.lineTo(3, 45);
    hullShape.lineTo(0, 50);
    hullShape.lineTo(-3, 45);
    hullShape.lineTo(-8, 30);
    hullShape.quadraticCurveTo(-15, 15, -20, 0);

    const hullGeometry = new THREE.ExtrudeGeometry(hullShape, {
        depth: 12,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 2,
        bevelSegments: 3
    });
    const hullMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.6,
        metalness: 0.4
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 6;
    hull.rotation.x = Math.PI / 2;
    hull.castShadow = true;
    hull.receiveShadow = true;
    boatGroup.add(hull);

    // Deck
    const deckShape = new THREE.Shape();
    deckShape.moveTo(-18, 0);
    deckShape.quadraticCurveTo(-12, -20, 0, -35);
    deckShape.lineTo(0, -40);
    deckShape.lineTo(0, -35);
    deckShape.quadraticCurveTo(12, -20, 18, 0);
    deckShape.quadraticCurveTo(12, 20, 0, 35);
    deckShape.lineTo(0, 40);
    deckShape.lineTo(0, 35);
    deckShape.quadraticCurveTo(-12, 20, -18, 0);

    const deckGeometry = new THREE.ExtrudeGeometry(deckShape, {
        depth: 3,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1
    });
    const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3561 });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 13;
    deck.rotation.x = Math.PI / 2;
    deck.castShadow = true;
    boatGroup.add(deck);

    // Mast
    const mastGeometry = new THREE.CylinderGeometry(0.5, 0.7, 90, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({
        color: 0x654321,
        roughness: 0.8
    });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 50, 0);
    mast.castShadow = true;
    boatGroup.add(mast);

    // Main sail
    const mainSailShape = new THREE.Shape();
    mainSailShape.moveTo(0, 0);
    mainSailShape.lineTo(0, 70);
    mainSailShape.lineTo(35, 50);
    mainSailShape.lineTo(35, 0);
    mainSailShape.lineTo(0, 0);

    const mainSailGeometry = new THREE.ExtrudeGeometry(mainSailShape, {
        depth: 0.5,
        bevelEnabled: false
    });
    const mainSailMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const mainSail = new THREE.Mesh(mainSailGeometry, mainSailMaterial);
    mainSail.position.set(18, 35, 0);
    mainSail.rotation.y = Math.PI / 4;
    boatGroup.add(mainSail);

    // Jib sail
    const jibShape = new THREE.Shape();
    jibShape.moveTo(0, 0);
    jibShape.lineTo(0, 55);
    jibShape.lineTo(28, 40);
    jibShape.lineTo(28, 0);
    jibShape.lineTo(0, 0);

    const jibGeometry = new THREE.ExtrudeGeometry(jibShape, {
        depth: 0.5,
        bevelEnabled: false
    });
    const jibMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
    });
    const jib = new THREE.Mesh(jibGeometry, jibMaterial);
    jib.position.set(15, 28, -5);
    jib.rotation.y = Math.PI / 3;
    boatGroup.add(jib);

    // Boom
    const boomGeometry = new THREE.CylinderGeometry(0.3, 0.3, 40, 8);
    const boomMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2c2c });
    const boom = new THREE.Mesh(boomGeometry, boomMaterial);
    boom.position.set(20, 8, 0);
    boom.rotation.z = Math.PI / 2;
    boom.castShadow = true;
    boatGroup.add(boom);

    game.boat.mesh = boatGroup;
    game.boat.mesh.userData.hull = hull;
    game.boat.mesh.userData.mast = mast;
    game.boat.mesh.userData.mainSail = mainSail;
    game.boat.mesh.userData.jib = jib;
    game.boat.mesh.userData.boom = boom;
    game.scene.add(boatGroup);
}

function updateSailPositions() {
    if (!game.boat.mesh) return;
    const sailSide = game.boat.direction === 1 ? 1 : -1;
    const mainSail = game.boat.mesh.userData.mainSail;
    const jib = game.boat.mesh.userData.jib;
    const boom = game.boat.mesh.userData.boom;

    if (mainSail) {
        mainSail.position.x = sailSide * 16;
        mainSail.rotation.y = sailSide * Math.PI / 4;
    }
    if (jib) {
        jib.position.x = sailSide * 13;
        jib.rotation.y = sailSide * Math.PI / 3;
    }
    if (boom) {
        boom.position.x = sailSide * 18;
    }
}

// ============================================================================
// BOAT MOVEMENT & NAVIGATION
// ============================================================================
function moveBoat() {
    if (game.gameComplete) return;
    
    // Handle crossing start line phase
    if (game.crossingStartLine) {
        handleStartLineCrossing();
        return;
    }
    
    if (game.currentLegIndex < 0) return;

    const currentLeg = CONFIG.legSequence[game.currentLegIndex];
    if (!currentLeg) return;

    // Handle gate phases
    if (game.gatePhase !== null) {
        handleLeewardGate();
        return;
    }

    // Handle maneuvers or navigation
    if (hasMoreManeuvers()) {
        if (!game.isMoving) return;
        moveBoatForward();
        checkManeuverDistance();
        
        if (!hasMoreManeuvers() && areAllManeuversComplete()) {
            game.allManeuversComplete = true;
        }
    } else {
        if (game.allManeuversComplete) {
            exitToFinish();
        } else {
            navigateToTarget(currentLeg);
        }
    }
}

function moveBoatForward() {
    const prevX = game.boat.x;
    const prevZ = game.boat.z;
    game.boat.x += Math.cos(game.boat.angle) * CONFIG.boat.speed;
    game.boat.z += Math.sin(game.boat.angle) * CONFIG.boat.speed;
    updateBoatPosition();
    const moveDist = distance(prevX, prevZ, game.boat.x, game.boat.z);
    game.distanceSinceLastManeuver += moveDist;
}

function checkManeuverDistance() {
    if (game.distanceSinceLastManeuver >= CONFIG.boat.maneuverDistance) {
        game.isMoving = false;
        game.distanceSinceLastManeuver = 0;
    }
}

function navigateToTarget(leg) {
    const target = CONFIG.course[leg.target];
    if (!target) return;

    if (leg.target === "windwardMark") {
        navigateToMark(target);
    } else if (leg.target === "finish") {
        navigateToFinish(target);
    } else if (leg.target === "leewardGate1") {
        handleLeewardGate();
    }
}

function navigateToMark(mark) {
    const dist = distance(game.boat.x, game.boat.z, mark.x, mark.y);
    
    if (dist < CONFIG.boat.roundingRadius) {
        roundMark(mark);
    } else {
        const angle = getAngleToPoint(game.boat.x, game.boat.z, mark.x, mark.y);
        game.boat.angle = angle;
        game.boat.x += Math.cos(angle) * CONFIG.boat.speed * 2;
        game.boat.z += Math.sin(angle) * CONFIG.boat.speed * 2;
        updateBoatPosition();
    }
}

function roundMark(mark) {
    const angleToMark = getAngleToPoint(game.boat.x, game.boat.z, mark.x, mark.y);
    const moveAngle = angleToMark + Math.PI / 2;
    
    game.boat.angle = moveAngle;
    game.boat.x += Math.cos(moveAngle) * CONFIG.boat.speed * 2;
    game.boat.z += Math.sin(moveAngle) * CONFIG.boat.speed * 2;
    updateBoatPosition();

    if (game.boat.z < mark.y - 20) {
        completeLeg();
    }
}

function navigateToFinish(finish) {
    if (game.boat.z > finish.y + CONFIG.boat.finishClearance) {
        game.isMoving = false;
        game.gameComplete = true;
        showGameComplete();
        return;
    }
    
    const angle = getAngleToPoint(game.boat.x, game.boat.z, finish.x, finish.y);
    game.boat.angle = angle;
    game.boat.x += Math.cos(angle) * CONFIG.boat.speed * 2;
    game.boat.z += Math.sin(angle) * CONFIG.boat.speed * 2;
    updateBoatPosition();
}

function exitToFinish() {
    const finish = CONFIG.course.finish;
    
    if (!game.boatExiting) {
        game.boatExiting = true;
    }
    
    const hasCrossedFinish = game.boat.z > finish.y;
    
    if (hasCrossedFinish) {
        game.boat.x += Math.cos(game.boat.angle) * CONFIG.boat.speed * 2;
        game.boat.z += Math.sin(game.boat.angle) * CONFIG.boat.speed * 2;
        updateBoatPosition();
        
        const course = CONFIG.course;
        const maxZ = Math.max(course.start.y, course.leewardGate1.y, course.leewardGate2.y, course.windwardMark.y) + 100;
        
        if (game.boat.z > maxZ + 200) {
            game.isMoving = false;
            game.gameComplete = true;
            showGameComplete();
            return;
        }
    } else {
        const angle = getAngleToPoint(game.boat.x, game.boat.z, finish.x, finish.y);
        game.boat.angle = angle;
        game.boat.x += Math.cos(angle) * CONFIG.boat.speed * 2;
        game.boat.z += Math.sin(angle) * CONFIG.boat.speed * 2;
        updateBoatPosition();
    }
}

function handleLeewardGate() {
    const gate1 = CONFIG.course.leewardGate1;
    const gate2 = CONFIG.course.leewardGate2;
    const centerX = (gate1.x + gate2.x) / 2;
    const centerY = (gate1.y + gate2.y) / 2;

    // Initialize gate phase if not already set
    if (game.gatePhase === null) {
        // Check if boat is already past the gate (z > gate y means past it going downwind)
        // Gate is at y=400, so if boat.z > 400, it's past the gate
        if (game.boat.z > centerY + 30) {
            // Boat is past the gate - navigate back to gate center first
            const distToCenter = distance(game.boat.x, game.boat.z, centerX, centerY);
            if (distToCenter > 50) {
                // Navigate towards gate center
                const angle = getAngleToPoint(game.boat.x, game.boat.z, centerX, centerY);
                game.boat.angle = angle;
                game.boat.x += Math.cos(angle) * CONFIG.boat.speed * 2;
                game.boat.z += Math.sin(angle) * CONFIG.boat.speed * 2;
                updateBoatPosition();
                return;
            } else {
                // Close enough to gate center, start gate sequence
                game.gatePhase = "between";
                const dist1 = distance(game.boat.x, game.boat.z, gate1.x, gate1.y);
                const dist2 = distance(game.boat.x, game.boat.z, gate2.x, gate2.y);
                game.gateMarkTarget = dist1 < dist2 ? gate1 : gate2;
            }
        } else {
            // Boat is at or above gate level - start gate sequence
            game.gatePhase = "between";
            const dist1 = distance(game.boat.x, game.boat.z, gate1.x, gate1.y);
            const dist2 = distance(game.boat.x, game.boat.z, gate2.x, gate2.y);
            game.gateMarkTarget = dist1 < dist2 ? gate1 : gate2;
        }
    }

    const targetMark = game.gateMarkTarget;

    if (game.gatePhase === "between") {
        const distToCenter = distance(game.boat.x, game.boat.z, centerX, centerY);
        const betweenGates = game.boat.x >= Math.min(gate1.x, gate2.x) - 30 &&
                            game.boat.x <= Math.max(gate1.x, gate2.x) + 30 &&
                            game.boat.z >= Math.min(gate1.y, gate2.y) - 30 &&
                            game.boat.z <= Math.max(gate1.y, gate2.y) + 30;

        if (betweenGates && distToCenter < 30) {
            game.gatePhase = "rounding";
        } else {
            const angle = getAngleToPoint(game.boat.x, game.boat.z, centerX, centerY);
            game.boat.angle = angle;
            game.boat.x += Math.cos(angle) * CONFIG.boat.speed * 2;
            game.boat.z += Math.sin(angle) * CONFIG.boat.speed * 2;
            updateBoatPosition();
        }
    } else if (game.gatePhase === "rounding") {
        const distToMark = distance(game.boat.x, game.boat.z, targetMark.x, targetMark.y);
        
        if (distToMark < CONFIG.boat.roundingRadius) {
            roundMark(targetMark);
        } else {
            const angle = getAngleToPoint(game.boat.x, game.boat.z, targetMark.x, targetMark.y);
            game.boat.angle = angle;
            game.boat.x += Math.cos(angle) * CONFIG.boat.speed * 2;
            game.boat.z += Math.sin(angle) * CONFIG.boat.speed * 2;
            updateBoatPosition();
        }

        // Only transition to upwind phase if boat has actually rounded the mark
        // and is now upwind of it (z < mark.y means upwind in our coordinate system)
        if (game.boat.z < targetMark.y - 20) {
            // Ensure we've actually rounded - check that we were close to the mark
            const currentDistToMark = distance(game.boat.x, game.boat.z, targetMark.x, targetMark.y);
            if (currentDistToMark < CONFIG.boat.roundingRadius * 2) {
                game.gatePhase = "upwind";
            }
        }
    } else if (game.gatePhase === "upwind") {
        // Ensure we're actually transitioning from Downwind 1 to Upwind 2
        // Check that current leg is Downwind 1 before completing
        const currentLeg = CONFIG.legSequence[game.currentLegIndex];
        if (currentLeg && currentLeg.name === "Downwind 1") {
            // Transition to next leg (Upwind 2)
            completeLeg();
            // Clear gate phase AFTER completing leg to ensure proper transition
            game.gatePhase = null;
            game.gateMarkTarget = null;
        } else {
            // Something went wrong - reset gate phase
            game.gatePhase = null;
            game.gateMarkTarget = null;
        }
    }
}

function completeLeg() {
    game.currentLegIndex++;
    if (game.currentLegIndex >= CONFIG.legSequence.length) {
        game.gameComplete = true;
        showGameComplete();
        return;
    }
    
    const newLeg = CONFIG.legSequence[game.currentLegIndex];
    game.legManeuverIndex = 0;
    game.distanceSinceLastManeuver = 0;
    game.isMoving = true;
    
    // Set initial angle for new leg based on leg type
    if (newLeg.isUpwind) {
        game.boat.angle = 5 * Math.PI / 4; // Upwind starboard
        game.boat.direction = -1;
    } else {
        game.boat.angle = 3 * Math.PI / 4; // Downwind starboard
        game.boat.direction = -1;
    }
    updateBoatPosition();
    updateSailPositions();
}

function handleStartLineCrossing() {
    const start = CONFIG.course.start;
    
    // Boat starts at z = start.y (550)
    // Going upwind means decreasing z (towards windward mark at y=100)
    // Boat angle is 5π/4 (225°), sin(225°) is negative, so z decreases
    
    if (game.boat.z > start.y - 50) {
        // Still crossing - move forward in current upwind direction
        game.boat.x += Math.cos(game.boat.angle) * CONFIG.boat.speed * 2;
        game.boat.z += Math.sin(game.boat.angle) * CONFIG.boat.speed * 2;
        updateBoatPosition();
    } else {
        // Crossed the start line (z < 500), ready for first tack
        game.crossingStartLine = false;
        game.currentLegIndex = 0;
        game.legManeuverIndex = 0;
        game.isMoving = false;
        game.distanceSinceLastManeuver = 0;
    }
}

function updateBoatPosition() {
    if (game.boat.mesh) {
        game.boat.mesh.position.set(game.boat.x, 0, game.boat.z);
        game.boat.mesh.rotation.y = game.boat.angle;
    }
}

// ============================================================================
// MANEUVER HANDLING
// ============================================================================
function handleManeuver(e) {
    if (e) e.preventDefault();
    
    if (game.gameComplete) {
        restartGame();
        return;
    }

    const maneuver = getNextManeuver();
    if (!maneuver) return;

    showManeuverText(maneuver);

    if (maneuver.leg === "Start") {
        game.crossingStartLine = true;
        game.isMoving = true;
        updateButtonText();
        return;
    }
        
    const currentLeg = CONFIG.legSequence[game.currentLegIndex];
    if (!currentLeg) return;

    // Perform tack or gybe
    if (currentLeg.isUpwind) {
        game.boat.angle += game.boat.direction === -1 ? Math.PI / 2 : -Math.PI / 2;
        game.boat.direction *= -1;
    } else {
        game.boat.angle += game.boat.direction === -1 ? -Math.PI / 2 : Math.PI / 2;
        game.boat.direction *= -1;
    }

    game.boat.angle = normalizeAngle(game.boat.angle);
    updateBoatPosition();
    updateSailPositions();

    game.distanceSinceLastManeuver = 0;
    game.isMoving = true;
    
    if (areAllManeuversComplete()) {
        game.allManeuversComplete = true;
    }
    
    updateButtonText();
}

function showManeuverText(maneuver) {
    const display = document.getElementById('maneuver-display');
    if (!display) return;
    
    const currentLeg = maneuver.leg;
    const isLegChange = game.previousLeg !== null && game.previousLeg !== currentLeg;
    
    if (isLegChange) {
        // Leg changed - animate slide up, then slide down with new text
        display.classList.remove('slide-down');
        display.classList.add('slide-up');
        
        // After slide-up completes, change text and slide down
        setTimeout(() => {
            display.innerHTML = `<div class="maneuver-text">${maneuver.text}</div>`;
            display.classList.remove('slide-up');
            display.classList.add('slide-down');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                display.classList.remove('slide-down');
            }, 400);
        }, 400);
    } else {
        // Same leg - simple text change (fade transition)
        display.innerHTML = `<div class="maneuver-text">${maneuver.text}</div>`;
        display.style.opacity = '0';
        setTimeout(() => {
            display.style.opacity = '1';
        }, 10);
    }
    
    // Update previous leg
    game.previousLeg = currentLeg;
    display.style.display = 'block';
}

// ============================================================================
// ANIMATION
// ============================================================================
function animateWater() {
    if (!game.water) return;
    const time = Date.now() * 0.001;
    const geometry = game.water.geometry;
    const vertices = geometry.attributes.position.array;
    const originalY = geometry.attributes.position.originalY || [];

    if (originalY.length === 0) {
        for (let i = 0; i < vertices.length; i += 3) {
            originalY.push(vertices[i + 1]);
        }
        geometry.attributes.position.originalY = originalY;
    }

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        const wave1 = Math.sin(time * 0.8 + x * 0.015 + z * 0.01) * 4;
        const wave2 = Math.sin(time * 1.2 + x * 0.008 - z * 0.012) * 2;
        vertices[i + 1] = originalY[i / 3] + wave1 + wave2;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

function animateBoatHeeling() {
    if (!game.boat.mesh) return;
    const time = Date.now() * 0.001;
    const baseHeel = game.boat.direction === 1 ? -0.15 : 0.15;
    const waveHeel = Math.sin(time * 2) * 0.05;
    game.boat.mesh.rotation.x = baseHeel + waveHeel;
    game.boat.mesh.rotation.z = Math.sin(time * 1.5) * 0.03;
}

function showGameComplete() {
    game.gameComplete = true;
    game.isMoving = false;
    updateButtonText();
    
    if (!game.hasFinishedOnce) {
        game.hasFinishedOnce = true;
        showPDFButton();
    }
}

function updateButtonText() {
    const button = document.getElementById('maneuver-button');
    if (button) {
        if (game.gameComplete) {
            button.textContent = 'Play again';
        } else {
            // Determine current leg to set appropriate button text
            let currentLegName = null;
            
            if (game.currentLegIndex < 0) {
                // Start leg
                currentLegName = "Start";
            } else {
                const currentLeg = CONFIG.legSequence[game.currentLegIndex];
                if (currentLeg) {
                    currentLegName = currentLeg.name;
                }
            }
            
            // Set button text based on leg
            if (currentLegName === "Start" || currentLegName === "Upwind 1" || currentLegName === "Upwind 2") {
                button.textContent = 'Press to Tack';
            } else if (currentLegName === "Downwind 1" || currentLegName === "Downwind 2") {
                button.textContent = 'Press to Gybe';
            } else {
                // Fallback for any other cases
                button.textContent = 'Press for next maneuver';
            }
        }
    }
}

function showPDFButton() {
    let pdfButton = document.getElementById('pdf-button');
    if (!pdfButton) {
        pdfButton = document.createElement('button');
        pdfButton.id = 'pdf-button';
        pdfButton.className = 'pdf-button';
        pdfButton.textContent = 'Cover Letter and CV';
        pdfButton.addEventListener('click', function() {
            window.open('https://drive.google.com/file/d/1LhMOxmftbgSW0wUxt9C5AmLJOVPCU7UE/view', '_blank');
        });
        const buttonContainer = document.getElementById('button-container');
        if (buttonContainer) {
            buttonContainer.appendChild(pdfButton);
        } else {
            const maneuverButton = document.getElementById('maneuver-button');
            if (maneuverButton && maneuverButton.parentNode) {
                maneuverButton.parentNode.appendChild(pdfButton);
            }
        }
    }
    pdfButton.style.display = 'block';
}

function restartGame() {
    game.currentLegIndex = -1;
    game.legManeuverIndex = 0;
    game.distanceSinceLastManeuver = 0;
    game.isMoving = false;
    game.gameComplete = false;
    game.gatePhase = null;
    game.gateMarkTarget = null;
    game.allManeuversComplete = false;
    game.boatExiting = false;
    game.crossingStartLine = false;
    game.previousLeg = null; // Reset previous leg for animations
    
    game.boat.x = CONFIG.course.start.x;
    game.boat.z = CONFIG.course.start.y;
    game.boat.angle = 5 * Math.PI / 4;
    game.boat.direction = -1;
    updateBoatPosition();
    updateSailPositions();
    
    const startManeuver = maneuversData.find(m => m.leg === "Start");
    if (startManeuver) {
        // Reset previousLeg before showing start text to avoid animation on initial load
        game.previousLeg = null;
        showManeuverText(startManeuver);
    }
    
    updateButtonText();
    
    if (game.hasFinishedOnce) {
        const pdfButton = document.getElementById('pdf-button');
        if (pdfButton) {
            pdfButton.style.display = 'block';
        }
    }
}

// ============================================================================
// GAME LOOP
// ============================================================================
function gameLoop() {
    if (!game.renderer || !game.scene || !game.camera) return;

    animateWater();
    animateBoatHeeling();
    moveBoat();
    game.renderer.render(game.scene, game.camera);
    requestAnimationFrame(gameLoop);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
    init3D();

    // Set initial boat position at start line
    game.boat.x = CONFIG.course.start.x;
    game.boat.z = CONFIG.course.start.y;
    // Starboard tack at 45 degrees to wind (wind from top, so 225° = up-left at 45°)
    game.boat.angle = 5 * Math.PI / 4; // 225° = starboard tack upwind
    game.boat.direction = -1; // Starboard tack
    updateBoatPosition();
    updateSailPositions();

    // Show Start maneuver (no animation on initial load)
    game.previousLeg = null;
    const startManeuver = maneuversData.find(m => m.leg === "Start");
    if (startManeuver) {
        showManeuverText(startManeuver);
    }

    // Start boat moving automatically to cross start line
    game.crossingStartLine = true;
    game.isMoving = true;

    document.addEventListener('keydown', handleManeuver);
    const container = document.getElementById('gameContainer');
    if (container) {
        container.addEventListener('click', handleManeuver);
    }
    const button = document.getElementById('maneuver-button');
    if (button) {
        button.addEventListener('click', handleManeuver);
        updateButtonText();
    }

    gameLoop();
}

document.addEventListener('DOMContentLoaded', init);
