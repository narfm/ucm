export interface HierarchyNode {
  name: string;
  type: 'FILTER' | 'ORG' | 'PERSON' | string; // Allow dynamic filter types like 'FILTER/UPM_L1_NAME'
  filters?: string[];
  partyId?: string;
  childrenCount?: number;
  hasChildren?: boolean;
  legalEntity?: boolean;
  children?: HierarchyNode[];
  expanded?: boolean;
  level?: number;
  parent?: HierarchyNode;
}

export interface HierarchyRequest {
  filters: string[];
  hierarchyTypeCode: string;
  maxDepth: number;
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