'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  GraphNode, 
  GraphEdge, 
  EntityType,
  PersonalKnowledge,
} from '@/lib/knowledge/types';

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeGraphProps {
  knowledge: PersonalKnowledge;
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  type: EntityType | 'profile' | 'category' | 'subcategory';
  label: string;
  data?: GraphNode['data'];
  isHub?: boolean;
  isSubCategory?: boolean;
  category?: EntityType;
  parentSubCategory?: string;  // SubCategory ID this entity belongs to
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  type: string;
  isHubLink?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NODE_COLORS: Record<string, string> = {
  profile: '#f472b6',    // pink - central node
  category: '#6b7280',   // gray - category hubs
  subcategory: '#9ca3af', // lighter gray - sub-category nodes
  skill: '#3b82f6',      // blue
  project: '#8b5cf6',    // purple
  goal: '#10b981',       // emerald
  decision: '#f59e0b',   // amber
  person: '#ec4899',     // pink
  company: '#6366f1',    // indigo
  event: '#14b8a6',      // teal
  interest: '#f97316',   // orange
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

// ============================================================================
// GRAPH BUILDER - Hierarchical with Central Node
// ============================================================================

function buildHierarchicalGraph(knowledge: PersonalKnowledge): { nodes: D3Node[]; links: D3Link[] } {
  const nodes: D3Node[] = [];
  const links: D3Link[] = [];
  const entityIdMap = new Map<string, string>(); // Maps entity IDs to node IDs
  const subCategoryNodeIds = new Map<string, string>(); // Maps subCategory IDs to node IDs
  
  // 1. Create central "You" node
  const profileNode: D3Node = {
    id: 'profile-center',
    type: 'profile',
    label: knowledge.profile.name || 'You',
    isHub: true,
  };
  nodes.push(profileNode);
  
  // 2. Create category hub nodes and connect to center
  const categories: EntityType[] = ['skill', 'project', 'goal', 'decision', 'person', 'company', 'event', 'interest'];
  const categoryNodes = new Map<EntityType, D3Node>();
  
  for (const category of categories) {
    const count = getEntityCount(knowledge, category);
    if (count > 0) {
      const hubNode: D3Node = {
        id: `hub-${category}`,
        type: 'category',
        label: `${CATEGORY_LABELS[category]} (${count})`,
        isHub: true,
        category,
      };
      nodes.push(hubNode);
      categoryNodes.set(category, hubNode);
      
      // Connect hub to center
      links.push({
        id: `profile-to-${category}`,
        source: 'profile-center',
        target: `hub-${category}`,
        type: 'has',
        isHubLink: true,
      });
    }
  }
  
  // 2.5. Create sub-category nodes and connect to their parent category hubs
  const subCategories = knowledge.subCategories || [];
  for (const subCat of subCategories) {
    const subCatNodeId = `subcategory-${subCat.id}`;
    subCategoryNodeIds.set(subCat.id, subCatNodeId);
    
    // Count entities in this sub-category
    const entityCount = countEntitiesInSubCategory(knowledge, subCat.id);
    
    nodes.push({
      id: subCatNodeId,
      type: 'subcategory',
      label: `${subCat.name} (${entityCount})`,
      isSubCategory: true,
      category: subCat.parentCategory,
    });
    
    // Connect sub-category to its parent category hub
    const parentHubId = `hub-${subCat.parentCategory}`;
    if (categoryNodes.has(subCat.parentCategory)) {
      links.push({
        id: `${parentHubId}-to-${subCatNodeId}`,
        source: parentHubId,
        target: subCatNodeId,
        type: 'contains',
        isHubLink: true,
      });
    }
  }
  
  // Helper to get the correct parent node for an entity
  const getParentNodeId = (entitySubCategory: string | undefined, categoryType: EntityType): string => {
    if (entitySubCategory && subCategoryNodeIds.has(entitySubCategory)) {
      return subCategoryNodeIds.get(entitySubCategory)!;
    }
    return `hub-${categoryType}`;
  };
  
  // 3. Add entity nodes and connect to their category hubs or sub-categories
  
  // Skills
  for (const skill of knowledge.skills) {
    const nodeId = `skill-${skill.id}`;
    entityIdMap.set(skill.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'skill',
      label: skill.name,
      data: skill,
      parentSubCategory: skill.subCategory,
    });
    const parentId = getParentNodeId(skill.subCategory, 'skill');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // Projects
  for (const project of knowledge.projects) {
    const nodeId = `project-${project.id}`;
    entityIdMap.set(project.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'project',
      label: project.name,
      data: project,
      parentSubCategory: project.subCategory,
    });
    const parentId = getParentNodeId(project.subCategory, 'project');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // Goals
  for (const goal of knowledge.goals) {
    const nodeId = `goal-${goal.id}`;
    entityIdMap.set(goal.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'goal',
      label: goal.description.slice(0, 25) + (goal.description.length > 25 ? '...' : ''),
      data: goal,
      parentSubCategory: goal.subCategory,
    });
    const parentId = getParentNodeId(goal.subCategory, 'goal');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // Decisions
  for (const decision of knowledge.decisions) {
    const nodeId = `decision-${decision.id}`;
    entityIdMap.set(decision.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'decision',
      label: decision.description.slice(0, 25) + (decision.description.length > 25 ? '...' : ''),
      data: decision,
      parentSubCategory: decision.subCategory,
    });
    const parentId = getParentNodeId(decision.subCategory, 'decision');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // People
  for (const person of knowledge.people) {
    const nodeId = `person-${person.id}`;
    entityIdMap.set(person.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'person',
      label: person.name,
      data: person,
      parentSubCategory: person.subCategory,
    });
    const parentId = getParentNodeId(person.subCategory, 'person');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // Companies
  for (const company of knowledge.companies) {
    const nodeId = `company-${company.id}`;
    entityIdMap.set(company.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'company',
      label: company.name,
      data: company,
      parentSubCategory: company.subCategory,
    });
    const parentId = getParentNodeId(company.subCategory, 'company');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // Events
  for (const event of knowledge.events) {
    const nodeId = `event-${event.id}`;
    entityIdMap.set(event.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'event',
      label: event.description.slice(0, 25) + (event.description.length > 25 ? '...' : ''),
      data: event,
      parentSubCategory: event.subCategory,
    });
    const parentId = getParentNodeId(event.subCategory, 'event');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // Interests
  for (const interest of knowledge.interests) {
    const nodeId = `interest-${interest.id}`;
    entityIdMap.set(interest.id, nodeId);
    nodes.push({
      id: nodeId,
      type: 'interest',
      label: interest.topic,
      data: interest,
      parentSubCategory: interest.subCategory,
    });
    const parentId = getParentNodeId(interest.subCategory, 'interest');
    links.push({
      id: `${parentId}-to-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'contains',
      isHubLink: true,
    });
  }
  
  // 4. Add cross-entity relationships
  addCrossRelationships(knowledge, links, entityIdMap);
  
  return { nodes, links };
}

// Helper to count entities in a sub-category
function countEntitiesInSubCategory(knowledge: PersonalKnowledge, subCategoryId: string): number {
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

function addCrossRelationships(
  knowledge: PersonalKnowledge,
  links: D3Link[],
  entityIdMap: Map<string, string>
): void {
  const addedLinks = new Set<string>();
  
  const addLink = (sourceId: string, targetId: string, type: string) => {
    const sourceNodeId = entityIdMap.get(sourceId);
    const targetNodeId = entityIdMap.get(targetId);
    if (sourceNodeId && targetNodeId) {
      const linkKey = `${sourceNodeId}-${targetNodeId}`;
      const reverseLinkKey = `${targetNodeId}-${sourceNodeId}`;
      if (!addedLinks.has(linkKey) && !addedLinks.has(reverseLinkKey)) {
        addedLinks.add(linkKey);
        links.push({
          id: `rel-${linkKey}`,
          source: sourceNodeId,
          target: targetNodeId,
          type,
        });
      }
    }
  };
  
  // Project -> Skill relationships
  for (const project of knowledge.projects) {
    for (const skillId of project.relatedSkills) {
      addLink(project.id, skillId, 'uses');
    }
    for (const personId of project.relatedPeople) {
      addLink(project.id, personId, 'collaborated');
    }
    for (const companyId of project.relatedCompanies) {
      addLink(project.id, companyId, 'at');
    }
  }
  
  // Goal -> Skill/Project relationships
  for (const goal of knowledge.goals) {
    for (const skillId of goal.relatedSkills) {
      addLink(goal.id, skillId, 'requires');
    }
    for (const projectId of goal.relatedProjects) {
      addLink(goal.id, projectId, 'involves');
    }
  }
  
  // Decision -> Goal/Project relationships
  for (const decision of knowledge.decisions) {
    for (const goalId of decision.relatedGoals) {
      addLink(decision.id, goalId, 'affects');
    }
    for (const projectId of decision.relatedProjects) {
      addLink(decision.id, projectId, 'affects');
    }
  }
  
  // Person -> Project relationships
  for (const person of knowledge.people) {
    for (const projectId of person.relatedProjects) {
      addLink(person.id, projectId, 'worked_on');
    }
  }
  
  // Company -> Person/Project/Skill relationships
  for (const company of knowledge.companies) {
    for (const personId of company.relatedPeople) {
      addLink(company.id, personId, 'employs');
    }
    for (const projectId of company.relatedProjects) {
      addLink(company.id, projectId, 'owns');
    }
    for (const skillId of company.relatedSkills) {
      addLink(company.id, skillId, 'uses');
    }
  }
  
  // Event -> Entity relationships
  for (const event of knowledge.events) {
    for (const related of event.relatedEntities) {
      addLink(event.id, related.id, 'involves');
    }
  }
  
  // Interest -> Skill relationships
  for (const interest of knowledge.interests) {
    for (const skillId of interest.relatedSkills) {
      addLink(interest.id, skillId, 'relates');
    }
  }
  
  // Skill -> Skill relationships
  for (const skill of knowledge.skills) {
    for (const relatedSkillId of skill.relatedSkills) {
      addLink(skill.id, relatedSkillId, 'related');
    }
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KnowledgeGraphViz({ 
  knowledge, 
  onNodeClick, 
  selectedNodeId,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Render graph
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const { width, height } = dimensions;
    const { nodes, links } = buildHierarchicalGraph(knowledge);
    
    if (nodes.length === 0) return;
    
    // Create container group with zoom
    const g = svg.append('g');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // Create simulation with radial layout tendency
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => d.isHubLink ? 80 : 120)
        .strength((d: any) => d.isHubLink ? 0.8 : 0.3)
      )
      .force('charge', d3.forceManyBody()
        .strength((d: any) => {
          if (d.isHub) return -400;
          if (d.isSubCategory) return -300;
          return -150;
        })
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d: any) => {
          if (d.isHub) return 40;
          if (d.isSubCategory) return 30;
          return 25;
        })
      )
      .force('radial', d3.forceRadial(
        (d: any) => {
          if (d.id === 'profile-center') return 0;
          if (d.type === 'category') return 120;
          if (d.type === 'subcategory') return 180;
          return 250;
        },
        width / 2,
        height / 2
      ).strength((d: any) => d.id === 'profile-center' ? 1 : 0.3));
    
    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => d.isHubLink ? '#4b5563' : '#6366f1')
      .attr('stroke-opacity', (d: any) => d.isHubLink ? 0.4 : 0.6)
      .attr('stroke-width', (d: any) => d.isHubLink ? 1.5 : 1)
      .attr('stroke-dasharray', (d: any) => d.isHubLink ? 'none' : '4 2');
    
    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );
    
    // Node circles
    node.append('circle')
      .attr('r', (d: D3Node) => {
        if (d.id === 'profile-center') return 30;
        if (d.type === 'category') return 20;
        if (d.type === 'subcategory') return 15;
        return 10;
      })
      .attr('fill', (d: D3Node) => {
        if (d.type === 'subcategory' && d.category) {
          // Use a lighter version of the parent category color
          return NODE_COLORS[d.category] + '99'; // Add transparency
        }
        return NODE_COLORS[d.type] || '#6b7280';
      })
      .attr('stroke', (d: D3Node) => {
        if (d.id === selectedNodeId) return '#fff';
        if (d.id === 'profile-center') return '#f9a8d4';
        if (d.type === 'category') return '#9ca3af';
        if (d.type === 'subcategory' && d.category) return NODE_COLORS[d.category];
        return 'transparent';
      })
      .attr('stroke-width', (d: D3Node) => {
        if (d.id === 'profile-center') return 3;
        if (d.type === 'subcategory') return 2;
        return 2;
      })
      .on('mouseover', function(event, d) {
        const baseRadius = d.id === 'profile-center' ? 30 : d.type === 'category' ? 20 : d.type === 'subcategory' ? 15 : 10;
        d3.select(this).attr('r', baseRadius * 1.2);
        setHoveredNode(d);
      })
      .on('mouseout', function(event, d) {
        const baseRadius = d.id === 'profile-center' ? 30 : d.type === 'category' ? 20 : d.type === 'subcategory' ? 15 : 10;
        d3.select(this).attr('r', baseRadius);
        setHoveredNode(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.data && onNodeClick) {
          onNodeClick({ 
            id: d.id, 
            type: d.type as EntityType, 
            label: d.label, 
            data: d.data 
          });
        }
      });
    
    // Node labels
    node.append('text')
      .text((d: D3Node) => d.label)
      .attr('x', (d: D3Node) => {
        if (d.id === 'profile-center') return 0;
        if (d.type === 'category') return 25;
        return 14;
      })
      .attr('y', (d: D3Node) => d.id === 'profile-center' ? 45 : 4)
      .attr('text-anchor', (d: D3Node) => d.id === 'profile-center' ? 'middle' : 'start')
      .attr('font-size', (d: D3Node) => {
        if (d.id === 'profile-center') return '14px';
        if (d.type === 'category') return '12px';
        return '10px';
      })
      .attr('font-weight', (d: D3Node) => d.isHub ? 'bold' : 'normal')
      .attr('fill', (d: D3Node) => d.isHub ? '#e5e7eb' : '#9ca3af')
      .attr('pointer-events', 'none');
    
    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Initial zoom to fit
    const initialScale = 0.9;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
      .scale(initialScale)
    );
    
    return () => {
      simulation.stop();
    };
  }, [knowledge, dimensions, selectedNodeId, onNodeClick]);
  
  const totalEntities = 
    knowledge.skills.length + knowledge.projects.length + knowledge.goals.length +
    knowledge.decisions.length + knowledge.people.length + knowledge.companies.length +
    knowledge.events.length + knowledge.interests.length;
  
  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-gray-950 cursor-grab active:cursor-grabbing"
      />
      
      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-gray-900/95 backdrop-blur rounded-lg p-3 border border-gray-800">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">🖱️ Drag</span>
            <span>Pan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">⚙️ Scroll</span>
            <span>Zoom</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">🔘 Drag node</span>
            <span>Move</span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/95 backdrop-blur rounded-lg p-3 border border-gray-800">
        <div className="text-xs text-gray-500 mb-2 font-medium">
          Knowledge Graph ({totalEntities} entities)
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(CATEGORY_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: NODE_COLORS[type] }}
              />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Hovered node tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur rounded-lg p-3 border border-gray-800 max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: NODE_COLORS[hoveredNode.type] }}
            />
            <span className="text-xs text-gray-500 capitalize">
              {hoveredNode.type === 'category' ? hoveredNode.category : hoveredNode.type}
            </span>
          </div>
          <div className="text-sm text-white font-medium">
            {hoveredNode.label}
          </div>
          {hoveredNode.data && (
            <div className="text-xs text-gray-500 mt-1">Click for details</div>
          )}
        </div>
      )}
    </div>
  );
}
