import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

let coin, controls;
let flipping = false;
let flipStart = null;
let flipDuration = .9; // seconds
let flipSpins = 0;
let startRotation = 0;
const INITIAL_Y_ROTATION = 1.5; // Store the initial Y rotation
const MAX_HEIGHT = 1.8; // Maximum height the coin will reach during flip
let wrapper; // Parent wrapper for the coin
let flipSound; // Audio for flip sound

// Helper to load SVG as texture
function loadSVGTexture(url) {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = function () {
            const texture = new THREE.Texture(img);
            texture.needsUpdate = true;
            resolve(texture);
        };
        img.src = url;
    });
}

async function createCoin() {
    // Load SVG textures
    const [headTexture, tailTexture] = await Promise.all([
        loadSVGTexture('./assets/coin_head.svg'),
        loadSVGTexture('./assets/coin_tail.svg'),
    ]);
    headTexture.colorSpace = THREE.SRGBColorSpace;
    tailTexture.colorSpace = THREE.SRGBColorSpace;

    // Load flip sound
    flipSound = new Audio('./assets/flip.mp3');
    flipSound.volume = 1; // Set volume to 100%

    // Materials: [side, top, bottom]
    const materials = [
        new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.8,
            roughness: 0.8,
        }),
        new THREE.MeshStandardMaterial({
            map: headTexture,
            metalness: 0.8,
            roughness: 0.8,
            side: THREE.DoubleSide,  // Render both sides
        }),
        new THREE.MeshStandardMaterial({
            map: tailTexture,
            metalness: 0.8,
            roughness: 0.8,
            side: THREE.DoubleSide,  // Render both sides
        })
    ];

    // Create coin geometry (radiusTop, radiusBottom, height, radialSegments)
    const coinGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 64);
    // Ensure proper UV mapping
    coinGeometry.attributes.uv2 = coinGeometry.attributes.uv;
    coin = new THREE.Mesh(coinGeometry, materials);

    // Create wrapper
    wrapper = new THREE.Object3D();
    wrapper.add(coin);
    scene.add(wrapper);

    // Camera position
    camera.position.set(0, 3, 0);
    camera.lookAt(0, 0, 0);

    // Ensure coin faces camera on load (laying flat)
    coin.rotation.set(0, INITIAL_Y_ROTATION, 0);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // Limit the orbit controls to prevent flipping the view
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2;

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Add mouse move event for tilt effect
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    // Add click/tap event
    renderer.domElement.addEventListener('pointerdown', onCoinClick);

    animate();
}

function onMouseMove(event) {
    if (flipping) return;
    
    // Convert mouse position to -1 to 1 range
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Apply tilt based on mouse position
    // Limit the tilt angle to prevent extreme rotations
    const maxTilt = Math.PI / 6; // 30 degrees
    wrapper.rotation.x = y * maxTilt;
    wrapper.rotation.z = -x * maxTilt;
}

function onCoinClick() {
    if (flipping) return;
    flipping = true;
    flipStart = null;
    // Play flip sound
    flipSound.currentTime = 0; // Reset sound to start
    flipSound.play();
    // Store the current rotation as starting point
    startRotation = coin.rotation.x;
    // Randomize number of half-flips (between 8 and 16)
    // Each half-flip is 180 degrees (π radians)
    flipSpins = 8 + Math.floor(Math.random() * 8);
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    if (!coin) return;

    if (flipping) {
        if (!flipStart) flipStart = timestamp || performance.now();
        const elapsed = ((timestamp || performance.now()) - flipStart) / 1000;
        const t = Math.min(elapsed / flipDuration, 1);
        
        // Use randomized half-flips (π radians each)
        let xRot = flipSpins * Math.PI * t;
        
        // Smoother easing
        const easeOut = 1 - Math.pow(1 - t, 5); // Cubic ease out
        xRot = xRot * easeOut;
        
        // Add the rotation to the starting position
        coin.rotation.x = startRotation + xRot;
        coin.rotation.y = INITIAL_Y_ROTATION; // Keep the initial Y rotation

        // Add vertical movement
        // Parabolic motion: up and down
        const height = MAX_HEIGHT * Math.sin(t * Math.PI) * -1;
        coin.position.z = height;
        
        if (t >= 1) {
            // Reset position when done
            coin.position.z = 0;
            flipping = false;
        }
    } else {
        // Idle: no rotation
    }
    controls.update();
    renderer.render(scene, camera);
}

createCoin(); 