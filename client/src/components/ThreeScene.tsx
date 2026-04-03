import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

import { useTheme } from '../context/ThemeContext';

function Capsule() {
  const { theme } = useTheme();
  const meshRef = useRef<THREE.Mesh>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const lastMoveTime = useRef(Date.now());
  const isInteracting = useRef(false);
  
  const autoRotation = useRef({ x: 0, y: 0, z: 0 });
  const interactionFactor = useRef(0);

  // Get theme colors from CSS variables
  const [colors, setColors] = React.useState({ top: '#ffffff', bottom: '#3b82f6' });

  useEffect(() => {
    const updateColors = () => {
      const style = getComputedStyle(document.documentElement);
      setColors({
        top: style.getPropertyValue('--pill-top').trim(),
        bottom: style.getPropertyValue('--pill-bottom').trim()
      });
    };
    
    updateColors();
    // Small delay to ensure CSS variables are updated
    const timeout = setTimeout(updateColors, 50);
    return () => clearTimeout(timeout);
  }, [theme]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      lastMoveTime.current = Date.now();
      isInteracting.current = true;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const now = Date.now();
      
      // Check for inactivity (2 seconds for faster snap-back)
      if (now - lastMoveTime.current > 2000) {
        isInteracting.current = false;
      }

      // Smoothly transition between auto and mouse control
      interactionFactor.current = THREE.MathUtils.lerp(
        interactionFactor.current,
        isInteracting.current ? 1 : 0,
        0.08
      );

      // 1. Update Auto-Rotation (Idle state)
      autoRotation.current.x += delta * 0.5;
      autoRotation.current.y += delta * 0.3;
      autoRotation.current.z += delta * 0.1;

      // 2. Calculate Mouse Target Rotation (Full 3-axis range)
      // Pitch (X), Yaw (Y), Roll (Z)
      const targetMouseX = -mouse.current.y * Math.PI * 2.5;
      const targetMouseY = mouse.current.x * Math.PI * 2.5;
      const targetMouseZ = (mouse.current.x * mouse.current.y) * Math.PI;

      // 3. Blend the rotations
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        autoRotation.current.x,
        targetMouseX,
        interactionFactor.current
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        autoRotation.current.y,
        targetMouseY,
        interactionFactor.current
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        autoRotation.current.z,
        targetMouseZ,
        interactionFactor.current
      );
    }
  });

  return (
    <Float 
      speed={1.5} 
      rotationIntensity={0.1} 
      // Position stays fixed during interaction by reducing floatIntensity to near zero
      floatIntensity={THREE.MathUtils.lerp(0.5, 0, interactionFactor.current)}
    >
      <mesh ref={meshRef} scale={1.3}>
        <capsuleGeometry args={[0.6, 1.4, 32, 64]} />
        {/* Top half of the pill */}
        <meshStandardMaterial
          attach="material-0"
          color={colors.top}
          metalness={0.8}
          roughness={0.1}
        />
        {/* Bottom half of the pill */}
        <meshStandardMaterial
          attach="material-1"
          color={colors.bottom}
          metalness={0.8}
          roughness={0.1}
        />
        {/* Body of the pill - using a multi-material approach for the capsule */}
        {/* In Three.js, capsuleGeometry has groups. 0: top cap, 1: bottom cap, 2: cylinder */}
        <MeshDistortMaterial
          color={colors.top}
          speed={2}
          distort={0.1}
          radius={1}
          metalness={0.8}
          roughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  );
}

export default function ThreeScene() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        
        <Capsule />
        
        <ContactShadows 
          position={[0, -2.5, 0]} 
          opacity={0.4} 
          scale={10} 
          blur={2} 
          far={4.5} 
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
