'use client';

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Text, 
  Stars, 
  Float,
  Sparkles,
  MeshDistortMaterial,
  Trail,
  OrbitControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  GraphNode, 
  EntityType,
  PersonalKnowledge,
  Skill,
  Project,
  Goal,
  Decision,
  Person,
  Company,
  TimelineEvent,
  Interest,
} from '@/lib/knowledge/types';

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeGraph3DProps {
  knowledge: PersonalKnowledge;
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

interface Node3D {
  id: string;
  type: EntityType | 'profile' | 'category' | 'subcategory';
  label: string;
  position: [number, number, number];
  data?: unknown;
  isHub?: boolean;
  isSubCategory?: boolean;
  category?: EntityType;
  parentSubCategory?: string;
  color: string;
  size: number;
}

interface Link3D {
  id: string;
  source: [number, number, number];
  target: [number, number, number];
  isHubLink: boolean;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Cosmic/spacey colors for entity nodes - like distant stars and nebulae
const NODE_COLORS: Record<string, string> = {
  profile: '#ff6ec7',    // hot pink nebula
  category: '#8b9dc3',   // pale cosmic blue
  subcategory: '#a0aec0', // lighter cosmic blue for sub-categories
  skill: '#00d4ff',      // electric cyan star
  project: '#a855f7',    // purple nebula
  goal: '#4ade80',       // green aurora
  decision: '#fbbf24',   // golden sun
  person: '#f472b6',     // pink supernova
  company: '#818cf8',    // indigo galaxy
  event: '#2dd4bf',      // teal comet
  interest: '#fb923c',   // orange dwarf star
};

// Bright neon colors for category hub nodes (one degree from center) - like pulsars
const NEON_COLORS: Record<string, string> = {
  skill: '#00ffff',      // cyan pulsar
  project: '#e040fb',    // magenta nebula
  goal: '#39ff14',       // radioactive green
  decision: '#fff01f',   // electric yellow
  person: '#ff1493',     // deep pink quasar
  company: '#7b68ee',    // medium slate blue
  event: '#00fa9a',      // medium spring green
  interest: '#ff4500',   // orange red supergiant
};

const CATEGORY_LABELS: Record<EntityType, string> = {
  skill: 'Skills',
  project: 'Projects',
  goal: 'Goals',
  decision: 'Decisions',
  person: 'People',
  company: 'Companies',
  event: 'Events',
  interest: 'Interests',
};

// Helper to get node info for tooltip
function getNodeInfo(node: Node3D): { title: string; subtitle: string; details: string[] } {
  if (node.id === 'profile-center') {
    return { title: node.label, subtitle: 'You', details: ['The center of your universe'] };
  }
  
  if (node.type === 'category') {
    return { 
      title: node.label, 
      subtitle: 'Category Hub', 
      details: ['Click to explore'] 
    };
  }
  
  if (node.type === 'subcategory') {
    return { 
      title: node.label, 
      subtitle: 'Sub-Category', 
      details: ['Group of related entities'] 
    };
  }
  
  const data = node.data as Record<string, unknown> | undefined;
  if (!data) return { title: node.label, subtitle: node.type, details: [] };
  
  const details: string[] = [];
  
  switch (node.type) {
    case 'skill':
      if (data.level) details.push(`Level: ${data.level}`);
      if (data.category) details.push(`Category: ${data.category}`);
      break;
    case 'project':
      if (data.status) details.push(`Status: ${data.status}`);
      if (data.description) details.push(String(data.description).slice(0, 50) + '...');
      break;
    case 'goal':
      if (data.timeframe) details.push(`Timeframe: ${data.timeframe}`);
      if (data.status) details.push(`Status: ${data.status}`);
      break;
    case 'person':
      if (data.relationship) details.push(`Relationship: ${data.relationship}`);
      break;
    case 'company':
      if (data.role) details.push(`Role: ${data.role}`);
      if (data.relationship) details.push(`Type: ${data.relationship}`);
      break;
    case 'decision':
      if (data.impact) details.push(`Impact: ${data.impact}`);
      if (data.status) details.push(`Status: ${data.status}`);
      break;
    case 'interest':
      if (data.depth) details.push(`Depth: ${data.depth}`);
      break;
    case 'event':
      if (data.date) details.push(`Date: ${data.date}`);
      break;
  }
  
  return { 
    title: node.label, 
    subtitle: node.type.charAt(0).toUpperCase() + node.type.slice(1), 
    details 
  };
}

// ============================================================================
// 3D GRAPH BUILDER
// ============================================================================

function build3DGraph(knowledge: PersonalKnowledge): { nodes: Node3D[]; links: Link3D[] } {
  const nodes: Node3D[] = [];
  const links: Link3D[] = [];
  const nodePositions = new Map<string, [number, number, number]>();
  const entityIdMap = new Map<string, string>();
  const subCategoryPositions = new Map<string, [number, number, number]>();
  
  const profilePos: [number, number, number] = [0, 0, 0];
  nodes.push({
    id: 'profile-center',
    type: 'profile',
    label: knowledge.profile.name || 'You',
    position: profilePos,
    isHub: true,
    color: NODE_COLORS.profile,
    size: 3, // Larger center node
  });
  nodePositions.set('profile-center', profilePos);
  
  const categories: EntityType[] = ['skill', 'project', 'goal', 'decision', 'person', 'company', 'event', 'interest'];
  const hubRadius = 35; // Much larger radius for category hubs (was 15)
  const subCategoryRadius = 18; // Radius for sub-categories from their parent hub
  const entityRadius = 25; // Much larger radius for entities (was 10)
  
  // Build a map of sub-categories by parent category
  const subCategories = knowledge.subCategories || [];
  const subCategoriesByParent = new Map<EntityType, typeof subCategories>();
  for (const subCat of subCategories) {
    const existing = subCategoriesByParent.get(subCat.parentCategory) || [];
    existing.push(subCat);
    subCategoriesByParent.set(subCat.parentCategory, existing);
  }
  
  categories.forEach((category, index) => {
    const count = getEntityCount(knowledge, category);
    if (count === 0) return;
    
    // Distribute hubs more evenly in a sphere
    const phi = Math.acos(-1 + (2 * index + 1) / categories.length);
    const theta = Math.sqrt(categories.length * Math.PI) * phi;
    
    const hubPos: [number, number, number] = [
      hubRadius * Math.cos(theta) * Math.sin(phi),
      hubRadius * Math.sin(theta) * Math.sin(phi),
      hubRadius * Math.cos(phi),
    ];
    
    const hubId = `hub-${category}`;
    nodes.push({
      id: hubId,
      type: 'category',
      label: `${CATEGORY_LABELS[category]}`,
      position: hubPos,
      isHub: true,
      category,
      color: NEON_COLORS[category],
      size: 1.8, // Slightly larger hubs
    });
    nodePositions.set(hubId, hubPos);
    
    links.push({
      id: `profile-to-${category}`,
      source: profilePos,
      target: hubPos,
      isHubLink: true,
      color: NEON_COLORS[category],
    });
    
    // Create sub-category nodes for this category
    const categorySubCats = subCategoriesByParent.get(category) || [];
    const hubDir = new THREE.Vector3(...hubPos).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(hubDir, up).normalize();
    const forward = new THREE.Vector3().crossVectors(right, hubDir).normalize();
    
    categorySubCats.forEach((subCat, subCatIndex) => {
      const subCatPhi = (subCatIndex / Math.max(categorySubCats.length, 1)) * Math.PI * 2;
      
      const subCatPos: [number, number, number] = [
        hubPos[0] + (Math.cos(subCatPhi) * right.x + Math.sin(subCatPhi) * forward.x) * 5 + hubDir.x * subCategoryRadius,
        hubPos[1] + (Math.cos(subCatPhi) * right.y + Math.sin(subCatPhi) * forward.y) * 5 + hubDir.y * subCategoryRadius,
        hubPos[2] + (Math.cos(subCatPhi) * right.z + Math.sin(subCatPhi) * forward.z) * 5 + hubDir.z * subCategoryRadius,
      ];
      
      const subCatNodeId = `subcategory-${subCat.id}`;
      subCategoryPositions.set(subCat.id, subCatPos);
      nodePositions.set(subCatNodeId, subCatPos);
      
      // Count entities in this sub-category
      const entityCount = countEntitiesInSubCategory3D(knowledge, subCat.id);
      
      nodes.push({
        id: subCatNodeId,
        type: 'subcategory',
        label: `${subCat.name} (${entityCount})`,
        position: subCatPos,
        isSubCategory: true,
        category,
        color: subCat.color || NODE_COLORS[category],
        size: 1.2,
      });
      
      // Link sub-category to parent hub
      links.push({
        id: `${hubId}-to-${subCatNodeId}`,
        source: hubPos,
        target: subCatPos,
        isHubLink: true,
        color: NODE_COLORS[category],
      });
    });
    
    // Helper to get parent position for an entity
    const getParentPosition = (entitySubCategory: string | undefined): [number, number, number] => {
      if (entitySubCategory && subCategoryPositions.has(entitySubCategory)) {
        return subCategoryPositions.get(entitySubCategory)!;
      }
      return hubPos;
    };
    
    const getParentNodeId = (entitySubCategory: string | undefined): string => {
      if (entitySubCategory && subCategoryPositions.has(entitySubCategory)) {
        return `subcategory-${entitySubCategory}`;
      }
      return hubId;
    };
    
    const entities = getEntities(knowledge, category);
    
    entities.forEach((entity, entityIndex) => {
      const entitySubCategory = (entity as { subCategory?: string }).subCategory;
      const parentPos = getParentPosition(entitySubCategory);
      const parentNodeId = getParentNodeId(entitySubCategory);
      
      // Calculate position relative to parent (hub or sub-category)
      const parentDir = new THREE.Vector3(...parentPos).normalize();
      const parentUp = new THREE.Vector3(0, 1, 0);
      const parentRight = new THREE.Vector3().crossVectors(parentDir, parentUp).normalize();
      const parentForward = new THREE.Vector3().crossVectors(parentRight, parentDir).normalize();
      
      const entityPhi = (entityIndex / Math.max(entities.length, 1)) * Math.PI * 2;
      const entityTheta = Math.random() * 0.8 + 0.3; // More variation
      const spread = Math.min(entities.length * 0.8, 8); // More spread
      
      // Add some vertical variation too
      const verticalOffset = (Math.random() - 0.5) * 8;
      
      // Adjust radius based on whether entity has a sub-category parent
      const adjustedRadius = entitySubCategory ? entityRadius * 0.7 : entityRadius;
      
      const entityPos: [number, number, number] = [
        parentPos[0] + (Math.cos(entityPhi) * parentRight.x + Math.sin(entityPhi) * parentForward.x) * spread * entityTheta + parentDir.x * adjustedRadius * (0.4 + Math.random() * 0.6),
        parentPos[1] + (Math.cos(entityPhi) * parentRight.y + Math.sin(entityPhi) * parentForward.y) * spread * entityTheta + parentDir.y * adjustedRadius * (0.4 + Math.random() * 0.6) + verticalOffset,
        parentPos[2] + (Math.cos(entityPhi) * parentRight.z + Math.sin(entityPhi) * parentForward.z) * spread * entityTheta + parentDir.z * adjustedRadius * (0.4 + Math.random() * 0.6),
      ];
      
      const nodeId = `${category}-${entity.id}`;
      entityIdMap.set(entity.id, nodeId);
      
      nodes.push({
        id: nodeId,
        type: category,
        label: getEntityLabel(entity, category),
        position: entityPos,
        data: entity,
        parentSubCategory: entitySubCategory,
        color: NODE_COLORS[category],
        size: 0.5,
      });
      nodePositions.set(nodeId, entityPos);
      
      links.push({
        id: `${parentNodeId}-to-${nodeId}`,
        source: parentPos,
        target: entityPos,
        isHubLink: true,
        color: NODE_COLORS[category],
      });
    });
  });
  
  addCrossLinks(knowledge, links, nodePositions, entityIdMap);
  
  return { nodes, links };
}

// Helper to count entities in a sub-category for 3D graph
function countEntitiesInSubCategory3D(knowledge: PersonalKnowledge, subCategoryId: string): number {
  let count = 0;
  count += knowledge.skills.filter(s => s.subCategory === subCategoryId).length;
  count += knowledge.projects.filter(p => p.subCategory === subCategoryId).length;
  count += knowledge.goals.filter(g => g.subCategory === subCategoryId).length;
  count += knowledge.decisions.filter(d => d.subCategory === subCategoryId).length;
  count += knowledge.people.filter(p => p.subCategory === subCategoryId).length;
  count += knowledge.companies.filter(c => c.subCategory === subCategoryId).length;
  count += knowledge.events.filter(e => e.subCategory === subCategoryId).length;
  count += knowledge.interests.filter(i => i.subCategory === subCategoryId).length;
  return count;
}

function getEntityCount(knowledge: PersonalKnowledge, type: EntityType): number {
  switch (type) {
    case 'skill': return knowledge.skills.length;
    case 'project': return knowledge.projects.length;
    case 'goal': return knowledge.goals.length;
    case 'decision': return knowledge.decisions.length;
    case 'person': return knowledge.people.length;
    case 'company': return knowledge.companies.length;
    case 'event': return knowledge.events.length;
    case 'interest': return knowledge.interests.length;
    default: return 0;
  }
}

function getEntities(knowledge: PersonalKnowledge, type: EntityType): Array<{ id: string; [key: string]: unknown }> {
  switch (type) {
    case 'skill': return knowledge.skills as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'project': return knowledge.projects as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'goal': return knowledge.goals as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'decision': return knowledge.decisions as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'person': return knowledge.people as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'company': return knowledge.companies as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'event': return knowledge.events as unknown as Array<{ id: string; [key: string]: unknown }>;
    case 'interest': return knowledge.interests as unknown as Array<{ id: string; [key: string]: unknown }>;
    default: return [];
  }
}

function getEntityLabel(entity: { [key: string]: unknown }, type: EntityType): string {
  switch (type) {
    case 'skill':
    case 'project':
    case 'person':
    case 'company':
      return String(entity.name || 'Unknown').slice(0, 18);
    case 'goal':
    case 'decision':
    case 'event':
      return String(entity.description || 'Unknown').slice(0, 18);
    case 'interest':
      return String(entity.topic || 'Unknown').slice(0, 18);
    default:
      return 'Unknown';
  }
}

function addCrossLinks(
  knowledge: PersonalKnowledge,
  links: Link3D[],
  positions: Map<string, [number, number, number]>,
  entityIdMap: Map<string, string>
): void {
  const addedLinks = new Set<string>();
  
  const addLink = (sourceId: string, targetId: string) => {
    const sourceNodeId = entityIdMap.get(sourceId);
    const targetNodeId = entityIdMap.get(targetId);
    if (!sourceNodeId || !targetNodeId) return;
    
    const sourcePos = positions.get(sourceNodeId);
    const targetPos = positions.get(targetNodeId);
    if (!sourcePos || !targetPos) return;
    
    const linkKey = `${sourceNodeId}-${targetNodeId}`;
    const reverseLinkKey = `${targetNodeId}-${sourceNodeId}`;
    if (addedLinks.has(linkKey) || addedLinks.has(reverseLinkKey)) return;
    
    addedLinks.add(linkKey);
    links.push({
      id: `cross-${linkKey}`,
      source: sourcePos,
      target: targetPos,
      isHubLink: false,
      color: '#6366f1',
    });
  };
  
  for (const project of knowledge.projects) {
    project.relatedSkills.forEach(id => addLink(project.id, id));
    project.relatedPeople.forEach(id => addLink(project.id, id));
    project.relatedCompanies.forEach(id => addLink(project.id, id));
  }
  
  for (const goal of knowledge.goals) {
    goal.relatedSkills.forEach(id => addLink(goal.id, id));
    goal.relatedProjects.forEach(id => addLink(goal.id, id));
  }
  
  for (const decision of knowledge.decisions) {
    decision.relatedGoals.forEach(id => addLink(decision.id, id));
    decision.relatedProjects.forEach(id => addLink(decision.id, id));
  }
  
  for (const person of knowledge.people) {
    person.relatedProjects.forEach(id => addLink(person.id, id));
  }
  
  for (const company of knowledge.companies) {
    company.relatedPeople.forEach(id => addLink(company.id, id));
    company.relatedProjects.forEach(id => addLink(company.id, id));
    company.relatedSkills.forEach(id => addLink(company.id, id));
  }
  
  for (const interest of knowledge.interests) {
    interest.relatedSkills.forEach(id => addLink(interest.id, id));
  }
  
  for (const skill of knowledge.skills) {
    skill.relatedSkills.forEach(id => addLink(skill.id, id));
  }
}

// ============================================================================
// 3D COMPONENTS
// ============================================================================

// Special center "You" node with unique cosmic effects
function CenterNode({ 
  position, 
  label,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: { 
  position: [number, number, number];
  label: string;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const thirdRingRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (meshRef.current) {
      // Static scale with hover effect only (no breathing)
      meshRef.current.scale.setScalar(isHovered ? 1.15 : 1);
      meshRef.current.rotation.y += 0.003;
    }
    
    // Keep ring rotations for visual interest
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += 0.006;
    }
    
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= 0.01;
    }
    
    if (thirdRingRef.current) {
      thirdRingRef.current.rotation.x += 0.008;
    }
  });
  
  const size = 4; // Larger center node
  
  return (
    <group position={position}>
      {/* Rotating outer ring */}
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 2.5, 0.08, 16, 64]} />
        <meshBasicMaterial color="#f9a8d4" transparent opacity={0.6} />
      </mesh>
      
      {/* Rotating inner ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[size * 2, 0.06, 16, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
      
      {/* Third rotating ring */}
      <mesh ref={thirdRingRef} rotation={[Math.PI / 6, Math.PI / 2, 0]}>
        <torusGeometry args={[size * 1.6, 0.04, 16, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} />
      </mesh>
      
      {/* Main sphere with distortion */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh 
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onPointerOut(); document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[size, 64, 64]} />
          <MeshDistortMaterial
            color="#ff6ec7"
            emissive="#ff1493"
            emissiveIntensity={isSelected ? 1 : isHovered ? 0.8 : 0.5}
            roughness={0.2}
            metalness={0.3}
            distort={0.35}
            speed={1.5}
          />
        </mesh>
      </Float>
      
      {/* Inner bright core */}
      <mesh>
        <sphereGeometry args={[size * 0.5, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[size * 0.3, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      
      {/* Sparkles around - pink */}
      <Sparkles
        count={80}
        scale={15}
        size={4}
        speed={0.4}
        color="#ff6ec7"
      />
      
      {/* Extra sparkle layer - white */}
      <Sparkles
        count={50}
        scale={20}
        size={2.5}
        speed={0.2}
        color="#ffffff"
      />
      
      {/* Cyan sparkles */}
      <Sparkles
        count={40}
        scale={18}
        size={2}
        speed={0.3}
        color="#00d4ff"
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[size * 3.5, 0.1, 16, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

// Neon glowing category hub node
function NeonHubNode({ 
  position, 
  color, 
  size, 
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: { 
  position: [number, number, number];
  color: string;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      // Static scale with hover effect only (no pulsing)
      meshRef.current.scale.setScalar(isHovered ? 1.2 : 1);
    }
    
    // Keep ring rotation for visual interest
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02;
    }
  });
  
  const actualSize = size * 1.3; // Make hubs slightly larger
  
  return (
    <group position={position}>
      {/* Rotating neon ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[actualSize * 1.8, 0.06, 16, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Main neon sphere */}
      <Float speed={2} rotationIntensity={0.15} floatIntensity={0.25}>
        <mesh 
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onPointerOut(); document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[actualSize, 32, 32]} />
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 1.2 : isHovered ? 1.0 : 0.8}
            roughness={0.1}
            metalness={0.4}
            distort={0.25}
            speed={3}
          />
        </mesh>
      </Float>
      
      {/* Bright inner core */}
      <mesh>
        <sphereGeometry args={[actualSize * 0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      
      {/* Neon sparkles */}
      <Sparkles
        count={20}
        scale={5}
        size={2.5}
        speed={0.5}
        color={color}
      />
      
      {/* Selection rings */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[actualSize * 2.5, 0.08, 16, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

// Sub-category node - intermediate between hub and entities
function SubCategoryNode({ 
  position, 
  color, 
  size, 
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: { 
  position: [number, number, number];
  color: string;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      // Static scale with hover effect only
      meshRef.current.scale.setScalar(isHovered ? 1.15 : 1);
    }
    
    // Keep ring rotation for visual interest
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.015;
    }
  });
  
  const actualSize = size * 1.1;
  
  return (
    <group position={position}>
      {/* Rotating ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[actualSize * 1.5, 0.04, 16, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      
      {/* Main sphere */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh 
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onPointerOut(); document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[actualSize, 32, 32]} />
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.9 : isHovered ? 0.7 : 0.5}
            roughness={0.15}
            metalness={0.35}
            distort={0.2}
            speed={2}
          />
        </mesh>
      </Float>
      
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[actualSize * 0.4, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      
      {/* Sparkles */}
      <Sparkles
        count={12}
        scale={3}
        size={1.5}
        speed={0.4}
        color={color}
      />
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[actualSize * 2, 0.06, 16, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

// Regular entity node
function EntityNode({ 
  position, 
  color, 
  size, 
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: { 
  position: [number, number, number];
  color: string;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      // Static scale with hover effect only (no breathing)
      meshRef.current.scale.setScalar(1 + (isHovered ? 0.25 : 0));
      meshRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      // Static glow with hover effect only (no pulsing)
      glowRef.current.scale.setScalar(isHovered ? 1.4 : 1);
    }
  });
  
  const actualSize = size * (isHovered ? 1.1 : 1);
  
  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[actualSize * 2.5, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={isSelected ? 0.15 : isHovered ? 0.12 : 0.04} 
        />
      </mesh>
      
      {/* Main sphere */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh 
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onPointerOut(); document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[actualSize, 32, 32]} />
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.45 : 0.2}
            roughness={0.3}
            metalness={0.2}
            distort={0.2}
            speed={2}
          />
        </mesh>
      </Float>
      
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[actualSize * 0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={isHovered ? 0.5 : 0.25} />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[actualSize * 2, 0.04, 16, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// Floating label that faces camera
function NodeLabel({ 
  position, 
  label, 
  isHub,
  isHovered,
  isSelected,
  isCenter,
  isCategory,
  isSubCategory,
}: { 
  position: [number, number, number];
  label: string;
  isHub: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isCenter?: boolean;
  isCategory?: boolean;
  isSubCategory?: boolean;
}) {
  const textRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (textRef.current) {
      textRef.current.quaternion.copy(camera.quaternion);
    }
  });
  
  const show = isHub || isSubCategory || isHovered || isSelected;
  if (!show) return null;
  
  const yOffset = isCenter ? 4 : isCategory ? 2.8 : isSubCategory ? 2.0 : isHub ? 2.2 : 1.2;
  
  return (
    <group ref={textRef} position={[position[0], position[1] + yOffset, position[2]]}>
      <Text
        fontSize={isCenter ? 0.9 : isCategory ? 0.75 : isSubCategory ? 0.6 : isHub ? 0.7 : 0.5}
        color={isCenter ? '#f9a8d4' : isCategory ? '#ffffff' : isSubCategory ? '#e5e7eb' : isSelected ? '#ffffff' : isHovered ? '#ffffff' : '#e5e7eb'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#000000"
        fontWeight={isCenter || isCategory || isSubCategory ? 'bold' : 'normal'}
      >
        {label}
      </Text>
    </group>
  );
}

// Holographic tooltip that appears in 3D space next to hovered node
function HologramTooltip({ 
  node,
  tooltipInfo,
}: { 
  node: Node3D;
  tooltipInfo: { title: string; subtitle: string; details: string[] };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const containerRef = useRef<THREE.Group>(null);
  const scanLineRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  // Calculate offset based on node type
  const getOffset = () => {
    if (node.id === 'profile-center') return 8;
    if (node.type === 'category') return 5;
    return 4;
  };
  
  useFrame((state) => {
    if (groupRef.current) {
      // Make tooltip face camera
      groupRef.current.quaternion.copy(camera.quaternion);
    }
    
    // Scale tooltip to maintain constant screen size regardless of zoom
    if (containerRef.current) {
      const tooltipWorldPos = new THREE.Vector3(
        node.position[0] + getOffset(),
        node.position[1] + 1,
        node.position[2]
      );
      const distance = camera.position.distanceTo(tooltipWorldPos);
      // Base scale factor - adjust this to control the apparent size
      const baseScale = distance * 0.025;
      const clampedScale = Math.max(0.5, Math.min(baseScale, 3)); // Clamp between 0.5 and 3
      containerRef.current.scale.setScalar(clampedScale);
    }
    
    // Animate scan line
    if (scanLineRef.current) {
      const t = state.clock.elapsedTime;
      scanLineRef.current.position.y = Math.sin(t * 3) * 0.8;
      (scanLineRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 5) * 0.2;
    }
  });
  
  const offset = getOffset();
  const panelWidth = 4;
  const panelHeight = 2 + (tooltipInfo.details.length * 0.4);
  
  return (
    <group ref={containerRef} position={[node.position[0] + offset, node.position[1] + 1, node.position[2]]}>
      <group ref={groupRef}>
        {/* Connection line from node to tooltip */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-offset + 0.5, -1, 0, -panelWidth/2 - 0.1, 0, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={node.color} transparent opacity={0.6} />
        </line>
        
        {/* Hologram frame - outer glow */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[panelWidth + 0.4, panelHeight + 0.4]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.15} />
        </mesh>
        
        {/* Secondary glow */}
        <mesh position={[0, 0, -0.08]}>
          <planeGeometry args={[panelWidth + 0.8, panelHeight + 0.8]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.05} />
        </mesh>
        
        {/* Main hologram panel */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial color="#050510" transparent opacity={0.85} />
        </mesh>
        
        {/* Hologram border - top */}
        <mesh position={[0, panelHeight/2, 0.01]}>
          <planeGeometry args={[panelWidth, 0.04]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} />
        </mesh>
        
        {/* Hologram border - bottom */}
        <mesh position={[0, -panelHeight/2, 0.01]}>
          <planeGeometry args={[panelWidth, 0.04]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} />
        </mesh>
        
        {/* Hologram border - left */}
        <mesh position={[-panelWidth/2, 0, 0.01]}>
          <planeGeometry args={[0.04, panelHeight]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} />
        </mesh>
        
        {/* Hologram border - right */}
        <mesh position={[panelWidth/2, 0, 0.01]}>
          <planeGeometry args={[0.04, panelHeight]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} />
        </mesh>
        
        {/* Corner accents - top left */}
        <mesh position={[-panelWidth/2 + 0.15, panelHeight/2 - 0.15, 0.02]}>
          <planeGeometry args={[0.3, 0.05]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-panelWidth/2 + 0.15, panelHeight/2 - 0.15, 0.02]}>
          <planeGeometry args={[0.05, 0.3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        
        {/* Corner accents - top right */}
        <mesh position={[panelWidth/2 - 0.15, panelHeight/2 - 0.15, 0.02]}>
          <planeGeometry args={[0.3, 0.05]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[panelWidth/2 - 0.15, panelHeight/2 - 0.15, 0.02]}>
          <planeGeometry args={[0.05, 0.3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        
        {/* Corner accents - bottom left */}
        <mesh position={[-panelWidth/2 + 0.15, -panelHeight/2 + 0.15, 0.02]}>
          <planeGeometry args={[0.3, 0.05]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-panelWidth/2 + 0.15, -panelHeight/2 + 0.15, 0.02]}>
          <planeGeometry args={[0.05, 0.3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        
        {/* Corner accents - bottom right */}
        <mesh position={[panelWidth/2 - 0.15, -panelHeight/2 + 0.15, 0.02]}>
          <planeGeometry args={[0.3, 0.05]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[panelWidth/2 - 0.15, -panelHeight/2 + 0.15, 0.02]}>
          <planeGeometry args={[0.05, 0.3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        
        {/* Scanning line effect */}
        <mesh ref={scanLineRef} position={[0, 0, 0.02]}>
          <planeGeometry args={[panelWidth - 0.2, 0.02]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.5} />
        </mesh>
        
        {/* Horizontal divider line */}
        <mesh position={[0, panelHeight/2 - 0.7, 0.02]}>
          <planeGeometry args={[panelWidth - 0.4, 0.01]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.4} />
        </mesh>
        
        {/* Type indicator dot */}
        <mesh position={[-panelWidth/2 + 0.35, panelHeight/2 - 0.4, 0.03]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color={node.color} />
        </mesh>
        
        {/* Subtitle text */}
        <Text
          position={[-panelWidth/2 + 0.7, panelHeight/2 - 0.4, 0.03]}
          fontSize={0.22}
          color="#888888"
          anchorX="left"
          anchorY="middle"
          maxWidth={panelWidth - 1}
        >
          {tooltipInfo.subtitle.toUpperCase()}
        </Text>
        
        {/* Title text */}
        <Text
          position={[-panelWidth/2 + 0.3, panelHeight/2 - 1, 0.03]}
          fontSize={0.35}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
          maxWidth={panelWidth - 0.6}
          fontWeight="bold"
        >
          {tooltipInfo.title}
        </Text>
        
        {/* Detail texts */}
        {tooltipInfo.details.map((detail, i) => (
          <Text
            key={i}
            position={[-panelWidth/2 + 0.3, panelHeight/2 - 1.5 - (i * 0.4), 0.03]}
            fontSize={0.22}
            color="#aaaaaa"
            anchorX="left"
            anchorY="middle"
            maxWidth={panelWidth - 0.6}
          >
            {detail}
          </Text>
        ))}
        
        {/* Decorative data stream lines */}
        <mesh position={[panelWidth/2 - 0.2, -panelHeight/2 + 0.3, 0.02]}>
          <planeGeometry args={[0.02, 0.4]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[panelWidth/2 - 0.3, -panelHeight/2 + 0.25, 0.02]}>
          <planeGeometry args={[0.02, 0.3]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.4} />
        </mesh>
        <mesh position={[panelWidth/2 - 0.4, -panelHeight/2 + 0.2, 0.02]}>
          <planeGeometry args={[0.02, 0.2]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.3} />
        </mesh>
      </group>
      
      {/* Floating particles around tooltip */}
      <Sparkles
        count={15}
        scale={[panelWidth + 1, panelHeight + 1, 1]}
        size={1}
        speed={0.3}
        color={node.color}
        opacity={0.5}
      />
    </group>
  );
}

// Animated connection line with fluid energy flow
function FluidEnergyLine({ 
  start, 
  end, 
  isHubLink,
  color,
  isCenterLink,
}: { 
  start: [number, number, number];
  end: [number, number, number];
  isHubLink: boolean;
  color: string;
  isCenterLink: boolean;
}) {
  const tubeRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const flowOffset = useRef(Math.random() * 100);
  
  // Create curved path
  const { curve, points } = useMemo(() => {
    const midPoint = new THREE.Vector3(
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + (isCenterLink ? 2 : isHubLink ? 1 : 0.5),
      (start[2] + end[2]) / 2
    );
    
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      midPoint,
      new THREE.Vector3(...end)
    );
    
    return { curve, points: curve.getPoints(50) };
  }, [start, end, isHubLink, isCenterLink]);
  
  // Create tube geometry for the connection
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, isCenterLink ? 0.08 : isHubLink ? 0.04 : 0.025, 8, false);
  }, [curve, isHubLink, isCenterLink]);
  
  // Create particles for flow effect
  const particleGeometry = useMemo(() => {
    const particleCount = isCenterLink ? 15 : isHubLink ? 8 : 5;
    const positions = new Float32Array(particleCount * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [isHubLink, isCenterLink]);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime + flowOffset.current;
    
    // Animate tube opacity
    if (tubeRef.current) {
      const material = tubeRef.current.material as THREE.MeshBasicMaterial;
      const basePulse = Math.sin(t * 2) * 0.1 + 0.9;
      material.opacity = (isCenterLink ? 0.4 : isHubLink ? 0.25 : 0.15) * basePulse;
    }
    
    // Animate flowing particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;
      
      for (let i = 0; i < particleCount; i++) {
        // Each particle flows along the curve at different speeds
        const speed = 0.15 + (i * 0.02);
        const offset = i / particleCount;
        const progress = ((t * speed + offset) % 1);
        
        const point = curve.getPoint(progress);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <group>
      {/* Main tube connection */}
      <mesh ref={tubeRef} geometry={tubeGeometry}>
        <meshBasicMaterial 
          color={isCenterLink ? '#f9a8d4' : color} 
          transparent 
          opacity={isCenterLink ? 0.4 : isHubLink ? 0.25 : 0.15}
        />
      </mesh>
      
      {/* Flowing particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial 
          color={isCenterLink ? '#ffffff' : color}
          size={isCenterLink ? 0.3 : isHubLink ? 0.2 : 0.15}
          transparent
          opacity={0.9}
          sizeAttenuation={true}
        />
      </points>
    </group>
  );
}

// Interactive camera controls with orbit, zoom, and pan
function InteractiveControls({ 
  targetPosition,
  isZoomedIn,
  controlsRef,
}: { 
  targetPosition: [number, number, number] | null;
  isZoomedIn: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  
  // Smoothly animate to selected node when zoomed in
  useFrame(() => {
    if (controlsRef.current && targetPosition && isZoomedIn) {
      const target = new THREE.Vector3(...targetPosition);
      controlsRef.current.target.lerp(target, 0.05);
      
      // Calculate a nice viewing position - larger offset for bigger graph
      const offset = new THREE.Vector3(15, 8, 20);
      const desiredPos = target.clone().add(offset);
      camera.position.lerp(desiredPos, 0.03);
      
      controlsRef.current.update();
    }
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      panSpeed={0.8}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      zoomToCursor={true}
      minDistance={8}
      maxDistance={350}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      dampingFactor={0.05}
      enableDamping={true}
      makeDefault
    />
  );
}

// Main scene
function Scene({ 
  nodes, 
  links, 
  selectedNodeId,
  onNodeClick,
  hoveredNodeId,
  hoveredNode,
  setHoveredNodeId,
  setHoveredNode,
  isZoomedIn,
  controlsRef,
}: { 
  nodes: Node3D[];
  links: Link3D[];
  selectedNodeId: string | null;
  onNodeClick: (node: Node3D) => void;
  hoveredNodeId: string | null;
  hoveredNode: Node3D | null;
  setHoveredNodeId: (id: string | null) => void;
  setHoveredNode: (node: Node3D | null) => void;
  isZoomedIn: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const tooltipInfo = hoveredNode ? getNodeInfo(hoveredNode) : null;
  
  return (
    <>
      {/* Interactive camera controls */}
      <InteractiveControls 
        targetPosition={selectedNode?.position || null}
        isZoomedIn={isZoomedIn}
        controlsRef={controlsRef}
      />
      
      {/* Cosmic lighting setup */}
      <ambientLight intensity={0.15} />
      <pointLight position={[50, 50, 50]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-50, -30, -50]} intensity={0.4} color="#a855f7" /> {/* Purple nebula light */}
      <pointLight position={[0, -50, 0]} intensity={0.3} color="#00d4ff" /> {/* Cyan from below */}
      <pointLight position={[0, 0, 0]} intensity={0.8} color="#ff6ec7" /> {/* Center pink glow */}
      <pointLight position={[40, 20, -40]} intensity={0.3} color="#4ade80" /> {/* Green aurora */}
      <pointLight position={[-40, -20, 40]} intensity={0.3} color="#fbbf24" /> {/* Golden sun */}
      
      {/* Deep space star field - multiple layers for depth */}
      <Stars 
        radius={300} 
        depth={100} 
        count={8000} 
        factor={6} 
        saturation={0.3} 
        fade 
        speed={0.2}
      />
      
      {/* Closer star layer */}
      <Stars 
        radius={150} 
        depth={50} 
        count={2000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.4}
      />
      
      {/* Distant nebula particles - purple */}
      <Sparkles
        count={200}
        scale={200}
        size={3}
        speed={0.1}
        opacity={0.2}
        color="#a855f7"
      />
      
      {/* Cosmic dust - cyan */}
      <Sparkles
        count={150}
        scale={180}
        size={2}
        speed={0.15}
        opacity={0.25}
        color="#00d4ff"
      />
      
      {/* Ambient space particles - pink */}
      <Sparkles
        count={100}
        scale={150}
        size={2.5}
        speed={0.2}
        opacity={0.2}
        color="#ff6ec7"
      />
      
      {/* Golden cosmic dust */}
      <Sparkles
        count={80}
        scale={160}
        size={1.5}
        speed={0.12}
        opacity={0.15}
        color="#fbbf24"
      />
      
      {/* Close floating particles around the graph */}
      <Sparkles
        count={60}
        scale={100}
        size={1}
        speed={0.3}
        opacity={0.4}
        color="#ffffff"
      />
      
      {/* Connection lines with fluid flow */}
      {links.map((link) => (
        <FluidEnergyLine
          key={link.id}
          start={link.source}
          end={link.target}
          isHubLink={link.isHubLink}
          color={link.color}
          isCenterLink={link.id.startsWith('profile-to-')}
        />
      ))}
      
      {/* Nodes - render different components based on type */}
      {nodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        
        const handlePointerOver = () => {
          setHoveredNodeId(node.id);
          setHoveredNode(node);
        };
        
        const handlePointerOut = () => {
          setHoveredNodeId(null);
          setHoveredNode(null);
        };
        
        return (
          <group key={node.id}>
            {/* Render appropriate node type */}
            {node.id === 'profile-center' ? (
              <CenterNode
                position={node.position}
                label={node.label}
                isSelected={isSelected}
                isHovered={isHovered}
                onClick={() => onNodeClick(node)}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            ) : node.type === 'category' ? (
              <NeonHubNode
                position={node.position}
                color={node.color}
                size={node.size}
                isSelected={isSelected}
                isHovered={isHovered}
                onClick={() => onNodeClick(node)}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            ) : node.type === 'subcategory' ? (
              <SubCategoryNode
                position={node.position}
                color={node.color}
                size={node.size}
                isSelected={isSelected}
                isHovered={isHovered}
                onClick={() => onNodeClick(node)}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            ) : (
              <EntityNode
                position={node.position}
                color={node.color}
                size={node.size}
                isSelected={isSelected}
                isHovered={isHovered}
                onClick={() => onNodeClick(node)}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            )}
            
            {/* Labels for hubs and hovered/selected nodes */}
            <NodeLabel
              position={node.position}
              label={node.label}
              isHub={node.isHub || false}
              isHovered={isHovered}
              isSelected={isSelected}
              isCenter={node.id === 'profile-center'}
              isCategory={node.type === 'category'}
              isSubCategory={node.type === 'subcategory'}
            />
          </group>
        );
      })}
      
      {/* 3D Holographic tooltip */}
      {hoveredNode && tooltipInfo && (
        <HologramTooltip 
          node={hoveredNode}
          tooltipInfo={tooltipInfo}
        />
      )}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KnowledgeGraph3D({ 
  knowledge, 
  onNodeClick, 
  selectedNodeId = null,
}: KnowledgeGraph3DProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node3D | null>(null);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const controlsRef = useRef<any>(null);
  
  const { nodes, links } = useMemo(() => build3DGraph(knowledge), [knowledge]);
  
  const handleNodeClick = useCallback((node: Node3D) => {
    if (selectedNodeId === node.id) {
      // Clicking same node toggles zoom
      setIsZoomedIn(!isZoomedIn);
    } else {
      // New node selected
      setIsZoomedIn(true);
      if (node.data && onNodeClick) {
        onNodeClick({
          id: node.id,
          type: node.type as EntityType,
          label: node.label,
          data: node.data as Skill | Project | Goal | Decision | Person | Company | TimelineEvent | Interest,
        });
      }
    }
  }, [selectedNodeId, isZoomedIn, onNodeClick]);
  
  // Reset view function
  const handleResetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    setIsZoomedIn(false);
  }, []);
  
  // Reset zoom when selection cleared
  useEffect(() => {
    if (!selectedNodeId) {
      setIsZoomedIn(false);
    }
  }, [selectedNodeId]);
  
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 40, 100], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: '#020208' }}
        dpr={[1, 2]}
      >
        <Scene
          nodes={nodes}
          links={links}
          selectedNodeId={selectedNodeId}
          onNodeClick={handleNodeClick}
          hoveredNodeId={hoveredNodeId}
          hoveredNode={hoveredNode}
          setHoveredNodeId={setHoveredNodeId}
          setHoveredNode={setHoveredNode}
          isZoomedIn={isZoomedIn}
          controlsRef={controlsRef}
        />
      </Canvas>
      
      {/* Controls hint */}
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3 text-white/50 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-white/70">🖱️ Drag</span>
            <span>Rotate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70">⚙️ Scroll</span>
            <span>Zoom</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70">⇧ + Drag</span>
            <span>Pan</span>
          </div>
        </div>
      </div>
      
      {/* Reset view button */}
      <button
        onClick={handleResetView}
        className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-xl px-4 py-2 text-white/70 hover:text-white text-xs transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset View
      </button>
      
      {/* Zoom hint */}
      {selectedNodeId && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white/60 text-xs">
            Click node again to {isZoomedIn ? 'zoom out' : 'zoom in'}
          </div>
        </div>
      )}
    </div>
  );
}
