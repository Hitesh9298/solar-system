// Main Three.js variables
let scene, camera, renderer, controls;
let planets = [];
let sun;
let clock;
let animationPaused = false;
let stars;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let textureLoader = new THREE.TextureLoader();

// Planet data with texture paths
const planetData = [
    { name: 'Mercury', size: 0.4, distance: 5, speed: 1, orbitSpeed: 0.004, texture: 'assets/textures/8k_mercury.jpg' },
    { name: 'Venus', size: 0.6, distance: 7, speed: 0.8, orbitSpeed: 0.002, texture: 'assets/textures/8k_venus_surface.jpg' },
    { name: 'Earth', size: 0.6, distance: 10, speed: 0.7, orbitSpeed: 0.0015, texture: 'assets/textures/8k_earth_daymap.jpg', nightTexture: 'assets/textures/8k_earth_nightmap.jpg' },
    { name: 'Mars', size: 0.5, distance: 15, speed: 0.6, orbitSpeed: 0.0012, texture: 'assets/textures/8k_mars.jpg' },
    { name: 'Jupiter', size: 1.2, distance: 20, speed: 0.4, orbitSpeed: 0.0007, texture: 'assets/textures/8k_jupiter.jpg' },
    { name: 'Saturn', size: 1.0, distance: 25, speed: 0.3, orbitSpeed: 0.0005, texture: 'assets/textures/8k_saturn.jpg', hasRing: true, ringTexture: 'assets/textures/8k_saturn_ring_alpha.png' },
    { name: 'Uranus', size: 0.8, distance: 30, speed: 0.2, orbitSpeed: 0.0003, texture: 'assets/textures/2k_uranus.jpg' },
    { name: 'Neptune', size: 0.8, distance: 35, speed: 0.1, orbitSpeed: 0.0002, texture: 'assets/textures/2k_neptune.jpg' }
];

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 50);
    
    // Create renderer with improved settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.getElementById('container').appendChild(renderer.domElement);
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add clock for animations
    clock = new THREE.Clock();
    
    // Improved lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Main directional light (sun light)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 3, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Fill light to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, -3, -5);
    scene.add(fillLight);
    
    // Add stars background
    addStars();
    
    // Create the sun
    createSun();
    
    // Create planets
    createPlanets();
    
    // Add event listeners
    setupEventListeners();
    
    // Start animation loop
    animate();
}

// Create the sun with improved appearance
// Create the sun with improved appearance
function createSun() {
    const sunGeometry = new THREE.SphereGeometry(3, 128, 128);
    
    const sunTexture = textureLoader.load('assets/textures/8k_sun.jpg');
    const glowTexture = textureLoader.load('assets/textures/sunglow.jpg');
    
    // Sun material with smoother emission
    const sunMaterial = new THREE.MeshStandardMaterial({
        map: sunTexture,
        emissiveMap: glowTexture,
        emissive: 0xFDB813,
        emissiveIntensity: 5,  // Slightly increased for better core brightness
        roughness: 0.9,  // Softer appearance
        metalness: 0.0,  // Completely removed metalness
        normalMap: glowTexture,
        normalScale: new THREE.Vector2(0.5, 0.5),  // More subtle normal effect
        side: THREE.DoubleSide
    });
    
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // Inner glow - make it blend more with the core
    const innerGlowGeometry = new THREE.SphereGeometry(3.02, 96, 96);  // Closer to sun surface
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 0xFF8C00,
        transparent: true,
        opacity: 0.7,  // Slightly more visible but still subtle
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    sun.add(innerGlow);
    
    // Outer glow - smoother transition
    const outerGlowGeometry = new THREE.SphereGeometry(3.1, 64, 64);  // Reduced size gap
    const outerGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { type: "c", value: new THREE.Color(0xFF6D00) },  // Adjusted to match inner
            viewVector: { type: "v3", value: camera.position },
            time: { type: "f", value: 0 }
        },
        vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                vec3 actual_normal = normalize(normalMatrix * normal);
                intensity = pow(0.7 - dot(actual_normal, normalize(viewVector)), 1.8);  // Smoother falloff
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            uniform float time;
            varying float intensity;
            void main() {
                // More subtle ring effect
                float ringEffect = 0.9 + 0.1 * sin(intensity * 5.0 + time * 1.5);
                vec3 glow = glowColor * intensity * ringEffect*1.2;
                gl_FragColor = vec4(glow, 0.4);  // Reduced alpha for better blend
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    sun.add(outerGlow);
    
    // Corona effect - adjusted to bridge inner and outer
    const coronaGeometry = new THREE.SphereGeometry(3.0, 64, 64);  // Positioned between inner and outer
    const coronaMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 0xFF7D00,  // Intermediate color
        transparent: true,
        opacity: 0.4,  // Balanced opacity
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sun.add(corona);
    
    sun.userData.glow = {
        inner: innerGlow,
        outer: outerGlow,
        corona: corona,
        shaderTime: 0
    };
}
// Create planets with improved materials
function createPlanets() {
    planetData.forEach((planet, index) => {
        // Create planet
        const geometry = new THREE.SphereGeometry(planet.size, 64, 64); // Higher resolution
        const texture = textureLoader.load(planet.texture);
        
        // Improved material for all planets
        let material;
        if (planet.name === 'Earth') {
            const nightTexture = textureLoader.load(planet.nightTexture);
            material = new THREE.MeshStandardMaterial({ 
                map: texture,
                emissiveMap: nightTexture,
                emissive: 0x111111,
                emissiveIntensity: 0.5,
                roughness: 0.8,
                metalness: 0.2
            });
        } else {
            material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.8,
                metalness: 0.1
            });
        }
        
        const planetMesh = new THREE.Mesh(geometry, material);
        
        // Position planet
        planetMesh.position.x = planet.distance;
        
        // Create orbit path
        const orbitGeometry = new THREE.BufferGeometry();
        const orbitMaterial = new THREE.LineBasicMaterial({ 
            color: 0x555555, 
            transparent: true, 
            opacity: 0.3,
            linewidth: 1
        });
        const points = [];
        const segments = 64;
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                planet.distance * Math.cos(theta),
                0,
                planet.distance * Math.sin(theta)
            ));
        }
        
        orbitGeometry.setFromPoints(points);
        const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbit);
        
        // Add planet to scene
        scene.add(planetMesh);
        
        // Create ring for Saturn with improved appearance
        if (planet.hasRing) {
            const ringGeometry = new THREE.RingGeometry(planet.size * 1.5, planet.size * 1.8, 64);
            const ringTexture = textureLoader.load(planet.ringTexture);
            const ringMaterial = new THREE.MeshStandardMaterial({
                map: ringTexture,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.1
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 3;
            planetMesh.add(ring);
        }
        
        // Store planet data
        planets.push({
            mesh: planetMesh,
            name: planet.name,
            distance: planet.distance,
            speed: planet.speed,
            orbitSpeed: planet.orbitSpeed,
            originalSpeed: planet.speed
        });
    });
}

// Add stars to the background with texture
function addStars() {
    const starsTexture = textureLoader.load('assets/textures/8k_stars_milky_way.jpg');
    const starsGeometry = new THREE.SphereGeometry(1000, 64, 64);
    const starsMaterial = new THREE.MeshBasicMaterial({
        map: starsTexture,
        side: THREE.BackSide
    });
    stars = new THREE.Mesh(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Animation loop with sun glow effect
function animate() {
    if (!animationPaused) {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();
        
        if (sun.userData.glow) {
            sun.userData.glow.shaderTime += delta * 0.7;  // Slower animation
            if (sun.userData.glow.outer.material.uniforms) {
                sun.userData.glow.outer.material.uniforms.time.value = sun.userData.glow.shaderTime;
            }
            
            // More subtle and unified pulse
            const basePulse = Math.sin(elapsedTime*1.5) * 0.015 + 1.0;  // Very subtle pulse
            
            // More consistent scaling across layers
            sun.userData.glow.inner.scale.setScalar(basePulse * 1.006);
            sun.userData.glow.outer.scale.setScalar(basePulse * 1.012);
            sun.userData.glow.corona.scale.setScalar(basePulse * 1.009);
            
            // Smoother flickering
            const smoothFlicker = 0.97 + Math.sin(elapsedTime * 2.5) * 0.04;
            sun.material.emissiveIntensity = 4.0* smoothFlicker;
        }
         // Rest of the animation remains unchanged
        planets.forEach(planet => {
            planet.mesh.position.x = Math.cos(elapsedTime * planet.orbitSpeed * planet.speed) * planet.distance;
            planet.mesh.position.z = Math.sin(elapsedTime * planet.orbitSpeed * planet.speed) * planet.distance;
            planet.mesh.rotation.y += 0.01 * planet.speed;
        });
        
        sun.rotation.y += 0.003;  // Slower rotation
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// Set up event listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Speed controls
    planetData.forEach((planet, index) => {
        const slider = document.getElementById(`${planet.name.toLowerCase()}-speed`);
        const speedValue = slider.nextElementSibling;
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = `${value}x`;
            planets[index].speed = value;
        });
    });
    
    // Pause button
    document.getElementById('pause-btn').addEventListener('click', () => {
        animationPaused = !animationPaused;
        const btn = document.getElementById('pause-btn');
        btn.textContent = animationPaused ? 'Resume' : 'Pause';
        
        if (!animationPaused) {
            animate();
        }
    });
    
    // Theme toggle
    document.getElementById('theme-btn').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const btn = document.getElementById('theme-btn');
        btn.textContent = document.body.classList.contains('light-mode') ? 'Dark Mode' : 'Light Mode';
    });
    
    // Tooltip on mouse move
    window.addEventListener('mousemove', (event) => {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
        
        const tooltip = document.getElementById('tooltip');
        
        if (intersects.length > 0) {
            const planet = planets.find(p => p.mesh === intersects[0].object);
            if (planet) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX + 10}px`;
                tooltip.style.top = `${event.clientY + 10}px`;
                tooltip.textContent = planet.name;
                return;
            }
        }
        
        tooltip.style.display = 'none';
    });
}

// Start the application
init();