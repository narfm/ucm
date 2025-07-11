export interface HierarchyNode {
  name: string;
  type: 'FILTER' | 'ORG' | 'PER' | string; // Allow dynamic filter types like 'FILTER/UPM_L1_NAME'
  filters?: string[];
  partyId?: string;
  childrenCount?: number;
  hasChildren?: boolean;
  legalEntity?: boolean;
  children?: HierarchyNode[];
  expanded?: boolean;
  level?: number;
  parent?: HierarchyNode;
  childrenLoaded?: boolean; // Track if children have been loaded for lazy loading
  allChildrenLoaded?: boolean; // Track if ALL children have been fully loaded (no more lazy loading needed)
}

export interface HierarchyRequest {
  filters: string[];
  hierarchyTypeCode: string;
  maxDepth: number;
  rootPartyId?: string; // For lazy loading children of a specific node
}

export interface HierarchyResponse {
  root: {
    children: HierarchyNode[];
  };
}

export type FilterType = 
  | 'Asset Servicing'
  | 'Corporate Trust'
  | 'Credit Services'
  | 'Depository Receipts'
  | 'Markets'
  | 'Other'
  | 'Treasury Services';

export interface HierarchyLevel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface HierarchyConfig {
  levels: HierarchyLevel[];
  maxDepth: number;
  hierarchyTypeCode?: string;
}

export interface ColumnDefinition {
  key: keyof HierarchyNode | string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  minWidth?: string;
  resizable?: boolean;
  dataType?: 'string' | 'number' | 'boolean';
  align?: 'left' | 'center' | 'right';
}

export interface FilterCriteria {
  column: string;
  value: any;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
}

export interface SearchCriteria {
  searchText: string;
  columns?: string[];
  caseSensitive?: boolean;
}

export interface GridState {
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filters: FilterCriteria[];
  searchCriteria?: SearchCriteria;
  expandedNodeIds: Set<string>;
}

export interface HierarchyType {
  hierarchyTypeCode: string;
  groupDescText: string;
}