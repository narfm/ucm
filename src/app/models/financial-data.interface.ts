export interface DataNode {
  id: string;
  accountName: string;
  bankName: string;
  service: string;
  salesPerson: string;
  assetsUnderCustody: number;
  profitLoss: number;
  level: number;
  expanded?: boolean;
  children?: DataNode[];
  parent?: DataNode;
}

export interface ColumnDefinition {
  key: keyof DataNode | string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  minWidth?: string;
  resizable?: boolean;
  dataType?: 'string' | 'number' | 'currency';
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

export interface HierarchyMode {
  type: 'bank' | 'salesPerson' | 'service';
  groupBy?: string;
}

export interface GridState {
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filters: FilterCriteria[];
  searchCriteria?: SearchCriteria;
  hierarchyMode: HierarchyMode;
  expandedNodeIds: Set<string>;
}

export type ServiceType = 'Corporate Trust' | 'Treasury' | 'Custody';
export type BankName = 'BNY' | 'CITI' | 'State Street' | 'Goldman Sachs';
export type SalesPerson = 'Alice' | 'Bob' | 'Charlie' | 'Diana';
export type Region = 'GS Asia' | 'GS North America' | 'Europe' | 'India' | 'China' | 'USA' | 'Canada';