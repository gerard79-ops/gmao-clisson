/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Equipement } from '../types';
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Layers,
  Search,
  X,
  Folder,
  Check,
  AlertTriangle
} from 'lucide-react';

interface EquipmentTreeSelectProps {
  equipements: Equipement[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  atelierFilter?: string; // If set, only allow/show equipments from this atelier
  excludeId?: string; // Used in parent selector to prevent cyclic relationships
  noneLabel?: string; // Option to select "None" / empty
}

interface TreeNode {
  equipment: Equipement;
  children: TreeNode[];
}

export default function EquipmentTreeSelect({
  equipements,
  selectedId,
  onSelect,
  placeholder = "Sélectionner un équipement...",
  className = "",
  required = false,
  disabled = false,
  atelierFilter = "",
  excludeId = "",
  noneLabel = ""
}: EquipmentTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected equipment
  const selectedEquipment = useMemo(() => {
    return equipements.find(eq => eq.id === selectedId);
  }, [equipements, selectedId]);

  // Construct the hierarchy tree
  const treeData = useMemo(() => {
    // 1. Filter out excluded equipment (e.g. self)
    let filteredList = equipements;
    if (excludeId) {
      filteredList = filteredList.filter(eq => eq.id !== excludeId);
    }

    // 2. Build nodes dictionary
    const nodes: Record<string, TreeNode> = {};
    filteredList.forEach(eq => {
      nodes[eq.id] = { equipment: eq, children: [] };
    });

    const roots: TreeNode[] = [];

    // 3. Link child nodes to parents
    Object.values(nodes).forEach(node => {
      const parentId = node.equipment.parentId;
      if (parentId && nodes[parentId]) {
        nodes[parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [equipements, excludeId]);

  // Toggle node expansion
  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to check if a node or any of its descendants match the search query
  const searchMatches = useMemo(() => {
    const matches: Record<string, boolean> = {};
    const query = searchQuery.toLowerCase().trim();

    if (!query) return matches;

    const checkNode = (node: TreeNode): boolean => {
      const eq = node.equipment;
      const isMatch =
        eq.nom.toLowerCase().includes(query) ||
        eq.id.toLowerCase().includes(query) ||
        eq.atelier.toLowerCase().includes(query) ||
        (eq.type && eq.type.toLowerCase().includes(query)) ||
        (eq.marque && eq.marque.toLowerCase().includes(query));

      let hasMatchingChild = false;
      node.children.forEach(child => {
        if (checkNode(child)) {
          hasMatchingChild = true;
        }
      });

      const finalMatch = isMatch || hasMatchingChild;
      if (finalMatch) {
        matches[eq.id] = true;
      }
      return finalMatch;
    };

    treeData.forEach(root => checkNode(root));
    return matches;
  }, [treeData, searchQuery]);

  // Automatically expand parents of matches when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const newExpanded: Record<string, boolean> = {};
      Object.keys(searchMatches).forEach(id => {
        newExpanded[id] = true;
      });
      setExpandedNodes(prev => ({ ...prev, ...newExpanded }));
    }
  }, [searchQuery, searchMatches]);

  // Check if an equipment belongs to the filtered atelier
  const isAtelierMatch = (eq: Equipement) => {
    if (!atelierFilter) return true;
    return eq.atelier.toLowerCase() === atelierFilter.toLowerCase();
  };

  // Recursive tree renderer
  const renderTreeNodes = (nodesList: TreeNode[], depth = 0) => {
    return nodesList.map(node => {
      const eq = node.equipment;
      const hasChildren = node.children.length > 0;
      const isExpanded = !!expandedNodes[eq.id];
      const isSelected = eq.id === selectedId;
      const isAtelierOk = isAtelierMatch(eq);
      
      // If searching, only render if this node or a descendant matches
      if (searchQuery.trim() && !searchMatches[eq.id]) {
        return null;
      }

      const Icon = hasChildren ? Folder : Cpu;

      return (
        <div key={eq.id} className="select-none">
          {/* Node Row */}
          <div
            onClick={() => {
              if (isAtelierOk) {
                onSelect(eq.id);
                setIsOpen(false);
              }
            }}
            title={eq.nom}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            className={`group flex items-center justify-between py-2 pr-3 cursor-pointer transition text-xs border-y border-transparent ${
              isSelected
                ? 'bg-primary-900 text-white font-semibold'
                : isAtelierOk
                ? 'hover:bg-primary-50 dark:hover:bg-primary-900/30 text-primary-800 dark:text-primary-100'
                : 'opacity-40 hover:bg-red-50/20 dark:hover:bg-red-950/10 cursor-not-allowed text-primary-400'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Expand/Collapse Chevron */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => toggleNode(eq.id, e)}
                  className="p-1 rounded hover:bg-primary-200/50 dark:hover:bg-primary-800/50 text-primary-400 group-hover:text-primary-600 dark:group-hover:text-primary-300 shrink-0 transition"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <div className="w-6 shrink-0" />
              )}

              {/* Node Icon */}
              <Icon
                size={14}
                className={`shrink-0 ${
                  isSelected
                    ? 'text-white'
                    : isAtelierOk
                    ? 'text-indigo-500 dark:text-indigo-400'
                    : 'text-primary-300'
                }`}
              />

              {/* Node Info */}
              <div className="truncate min-w-0 flex items-center gap-1.5">
                <span title={eq.nom} className="truncate">{eq.nom}</span>
                {eq.statut === 'HS' && (
                  <span className="text-[9px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-extrabold px-1 rounded flex items-center gap-0.5 shrink-0 animate-pulse">
                    <AlertTriangle size={8} /> HS
                  </span>
                )}
              </div>
            </div>

            {/* Right details / action indicators */}
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {/* Atelier Badge */}
              {!atelierFilter && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-primary-100 dark:bg-primary-800 text-primary-500'
                }`}>
                  {eq.atelier}
                </span>
              )}
              {isSelected && <Check size={12} className="text-white" />}
            </div>
          </div>

          {/* Render Children Recursively */}
          {hasChildren && isExpanded && (
            <div className="relative">
              {/* Left connector guide line */}
              <div
                style={{ left: `${depth * 16 + 18}px` }}
                className="absolute top-0 bottom-2 w-px bg-primary-100 dark:bg-primary-800/60 pointer-events-none"
              />
              {renderTreeNodes(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
          disabled
            ? 'bg-primary-100/50 dark:bg-primary-950/30 text-primary-400 border-primary-200/60 dark:border-primary-900/40 cursor-not-allowed'
            : isOpen
            ? 'bg-white dark:bg-primary-950 border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-500/10'
            : (selectedEquipment || (noneLabel && selectedId === ''))
            ? 'bg-white dark:bg-primary-950 border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white shadow-sm'
            : 'bg-primary-50/10 hover:bg-primary-50/30 dark:bg-primary-950 border-primary-200 dark:border-primary-800 text-primary-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Layers size={14} className={(selectedEquipment || (noneLabel && selectedId === '')) ? 'text-indigo-500' : 'text-primary-400'} />
          {selectedEquipment ? (
            <div className="truncate min-w-0">
              <span className="font-bold text-primary-900 dark:text-white">{selectedEquipment.nom}</span>
              <span className="text-[10px] text-primary-400 font-mono ml-2">({selectedEquipment.id})</span>
              {selectedEquipment.statut === 'HS' && (
                <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-bold px-1 py-0.5 rounded ml-2">HS</span>
              )}
            </div>
          ) : noneLabel && selectedId === '' ? (
            <span className="font-bold text-primary-900 dark:text-white italic">{noneLabel}</span>
          ) : (
            <span className="text-primary-400 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-primary-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Required state indicator for HTML forms validation compatibility */}
      {required && !selectedId && noneLabel === "" && (
        <input
          type="text"
          value=""
          required
          onChange={() => {}}
          className="absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
        />
      )}

      {/* Floating Tree Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[350px]">
          {/* Panel Search Bar */}
          <div className="p-2 border-b border-primary-50 dark:border-primary-900/60 bg-primary-50/20 dark:bg-primary-950 flex items-center gap-2">
            <Search size={14} className="text-primary-400 ml-1.5" />
            <input
              type="text"
              placeholder="Rechercher machine, ID, atelier, modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-transparent border-none outline-none focus:ring-0 p-1 flex-1 text-primary-800 dark:text-primary-100"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-400 hover:text-primary-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Help legend / Context info */}
          {atelierFilter && (
            <div className="px-3 py-1.5 bg-amber-500/10 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-b border-primary-50 dark:border-primary-900/40 text-[10px] font-medium">
              ⚠️ Seuls les équipements de l'atelier <strong>{atelierFilter}</strong> peuvent être sélectionnés.
            </div>
          )}

          {/* Tree Scroll Area */}
          <div className="arborescence-tree-container overflow-y-auto flex-1 max-h-64 divide-y divide-primary-50/50 dark:divide-primary-900/20">
            {noneLabel && !searchQuery && (
              <div
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between py-2.5 px-3.5 cursor-pointer text-xs transition ${
                  selectedId === ''
                    ? 'bg-primary-900 text-white font-semibold'
                    : 'hover:bg-primary-50 dark:hover:bg-primary-900/30 text-primary-500 dark:text-primary-400 italic'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <X size={14} className="text-red-500" />
                  <span>{noneLabel}</span>
                </div>
                {selectedId === '' && <Check size={12} className="text-white" />}
              </div>
            )}
            {treeData.length === 0 ? (
              <div className="p-6 text-center text-primary-400 text-xs">
                Aucun équipement disponible
              </div>
            ) : (
              renderTreeNodes(treeData)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
