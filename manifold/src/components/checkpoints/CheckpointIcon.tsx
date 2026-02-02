'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// 3D ICON GEOMETRIES (Procedural low-poly models)
// ============================================================================

function MoneyStack({ color = '#22c55e' }: { color?: string }) {
  return (
    <group>
      {[0, 0.15, 0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.8, 0.12, 0.4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {/* Dollar sign */}
      <mesh position={[0, 0.5, 0.21]}>
        <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI * 1.5]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

function House({ color = '#3b82f6' }: { color?: string }) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.6, 0.4, 4]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* Door */}
      <mesh position={[0, -0.1, 0.31]}>
        <boxGeometry args={[0.2, 0.3, 0.02]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
    </group>
  );
}

function Mansion({ color = '#fbbf24' }: { color?: string }) {
  return (
    <group>
      {/* Main building */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 0.6, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-0.4, -0.1, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.4, -0.1, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Columns */}
      {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.26]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
    </group>
  );
}

function Yacht({ color = '#f8fafc' }: { color?: string }) {
  return (
    <group>
      {/* Hull */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.2, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0.1, 0.2, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.25]} />
        <meshStandardMaterial color="#0ea5e9" />
      </mesh>
      {/* Mast */}
      <mesh position={[-0.2, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      {/* Flag */}
      <mesh position={[-0.2, 0.6, 0.05]}>
        <planeGeometry args={[0.15, 0.1]} />
        <meshStandardMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Scale({ color = '#a855f7' }: { color?: string }) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.1, 16]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      {/* Beam */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Left pan */}
      <mesh position={[-0.35, 0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Right pan */}
      <mesh position={[0.35, 0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

function GraduationCap({ color = '#1e293b' }: { color?: string }) {
  return (
    <group>
      {/* Cap base */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Button */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.05, 8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Tassel */}
      <mesh position={[0.3, -0.1, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Head part */}
      <mesh position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Briefcase({ color = '#78350f' }: { color?: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.5, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0.3, 0]}>
        <torusGeometry args={[0.1, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Clasp */}
      <mesh position={[0, 0.1, 0.11]}>
        <boxGeometry args={[0.15, 0.05, 0.02]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

function StormCloud({ color = '#475569' }: { color?: string }) {
  return (
    <group>
      {/* Cloud puffs */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.2, -0.05, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.2, -0.05, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Lightning bolt */}
      <mesh position={[0, -0.35, 0.1]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.05, 0.3, 3]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function RunningFigure({ color = '#22c55e' }: { color?: string }) {
  return (
    <group>
      {/* Head */}
      <mesh position={[0.1, 0.35, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.08, 0.25, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Front leg */}
      <mesh position={[0.15, -0.15, 0]} rotation={[0, 0, -0.5]}>
        <capsuleGeometry args={[0.04, 0.2, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Back leg */}
      <mesh position={[-0.1, -0.1, 0]} rotation={[0, 0, 0.8]}>
        <capsuleGeometry args={[0.04, 0.2, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Arms */}
      <mesh position={[0.15, 0.15, 0]} rotation={[0, 0, -1]}>
        <capsuleGeometry args={[0.03, 0.15, 8, 16]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
    </group>
  );
}

function CardboardBox({ color = '#a16207' }: { color?: string }) {
  return (
    <group>
      {/* Box */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Flaps */}
      <mesh position={[-0.15, 0.22, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.28, 0.02, 0.38]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.15, 0.22, 0]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.28, 0.02, 0.38]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Sunrise({ color = '#fbbf24' }: { color?: string }) {
  return (
    <group>
      {/* Sun */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.5} 
        />
      </mesh>
      {/* Rays */}
      {[0, 45, 90, 135, 180].map((angle, i) => (
        <mesh 
          key={i} 
          position={[
            Math.cos((angle * Math.PI) / 180) * 0.4,
            Math.sin((angle * Math.PI) / 180) * 0.4 + 0.1,
            0
          ]}
          rotation={[0, 0, (angle * Math.PI) / 180]}
        >
          <boxGeometry args={[0.15, 0.03, 0.03]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Horizon line */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[1, 0.02, 0.1]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

// ============================================================================
// ROTATING ICON WRAPPER
// ============================================================================

function RotatingIcon({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={groupRef}>
        {children}
      </group>
    </Float>
  );
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_COMPONENTS: Record<string, React.FC<{ color?: string }>> = {
  'money-stack': MoneyStack,
  'house': House,
  'mansion': Mansion,
  'yacht': Yacht,
  'scale': Scale,
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'storm-cloud': StormCloud,
  'running': RunningFigure,
  'cardboard-box': CardboardBox,
  'sunrise': Sunrise,
};

// ============================================================================
// MAIN CHECKPOINT ICON COMPONENT
// ============================================================================

interface CheckpointIconProps {
  icon: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export function CheckpointIcon({ 
  icon, 
  size = 60, 
  className = '',
  style = {},
  label,
}: CheckpointIconProps) {
  const IconComponent = ICON_COMPONENTS[icon] || MoneyStack;
  
  return (
    <div 
      className={`relative ${className}`} 
      style={{ width: size, height: size, ...style }}
    >
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 2]} intensity={1} />
        <pointLight position={[-2, -2, -2]} intensity={0.5} color="#6366f1" />
        
        <RotatingIcon>
          <IconComponent />
        </RotatingIcon>
      </Canvas>
      
      {label && (
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MILESTONE BADGE COMPONENT (for inline use)
// ============================================================================

interface MilestoneBadgeProps {
  icon: string;
  label: string;
  description?: string;
  year?: number;
}

export function MilestoneBadge({ icon, label, description, year }: MilestoneBadgeProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-800/60 rounded-lg p-2 border border-gray-700">
      <CheckpointIcon icon={icon} size={40} />
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
        {year && <p className="text-xs text-gray-500">Year {year}</p>}
      </div>
    </div>
  );
}
