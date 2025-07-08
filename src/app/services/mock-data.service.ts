import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { HierarchyNode, HierarchyRequest, HierarchyResponse, FilterType, FilterCriteria } from '../models/financial-data.interface';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private filterTypes: FilterType[] = [
    'Asset Servicing',
    'Corporate Trust',
    'Credit Services',
    'Depository Receipts',
    'Markets',
    'Other',
    'Treasury Services'
  ];

  private organizationNames = [
    ['ACCT', 'FUND', 'TRUST', 'CORP', 'INVEST', 'CAPITAL', 'HOLDINGS', 'PARTNERS', 'GROUP', 'LLC'],
    ['Asset', 'Global', 'International', 'Capital', 'Finance', 'Investment', 'Securities', 'Management'],
    ['Services', 'Solutions', 'Advisors', 'Associates', 'Company', 'Limited', 'Corporation']
  ];

  private personNames = {
    firstNames: ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Lisa', 'James', 'Mary'],
    lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson']
  };

  private nodeIdCounter = 0;

  generateHierarchicalData(request: HierarchyRequest): Observable<HierarchyResponse> {
    const response: HierarchyResponse = {
      root: {
        children: []
      }
    };

    // For each filter, create a filter node
    request.filters.forEach(filter => {
      if (filter === 'UPM_L1_NAME') {
        // Create nodes for each filter type
        this.filterTypes.forEach(filterType => {
          const filterNode = this.createFilterNode(filterType, filter, request.maxDepth);
          response.root.children.push(filterNode);
        });
      }
    });

    // Simulate loading delay and return as Observable
    return of(response).pipe(delay(1500));
  }

  private createFilterNode(filterType: FilterType, filterName: string, maxDepth: number): HierarchyNode {
    const filterNode: HierarchyNode = {
      name: filterType,
      type: 'FILTER',
      filters: [`${filterName}/${filterType}`],
      children: [],
      expanded: false
    };

    if (maxDepth > 1) {
      // Generate organization nodes under each filter
      const orgCount = this.randomBetween(3, 8);
      for (let i = 0; i < orgCount; i++) {
        const orgNode = this.createOrganizationNode(filterType, filterNode, 1, maxDepth);
        filterNode.children!.push(orgNode);
      }
    }

    return filterNode;
  }

  private createOrganizationNode(filterType: FilterType, parent: HierarchyNode, currentDepth: number, maxDepth: number): HierarchyNode {
    this.nodeIdCounter++;
    const hasChildren = currentDepth < maxDepth;
    const childrenCount = hasChildren ? this.randomBetween(0, 5) : 0;
    const nodeType: 'PERSON' | 'ORG' = Math.random() > 0.8 ? 'PERSON' : 'ORG';
    const name = nodeType === 'PERSON' ? this.generatePersonName() : this.generateOrganizationName(filterType);

    const orgNode: HierarchyNode = {
      name: name,
      type: nodeType,
      partyId: `${filterType.replace(/\s+/g, '')}${nodeType === 'PERSON' ? 'PER' : 'ACCT'}${this.nodeIdCounter}`,
      childrenCount: childrenCount,
      hasChildren: childrenCount > 0,
      legalEntity: Math.random() > 0.3,
      children: [],
      expanded: false,
      parent: parent
    };

    // Generate children if not at max depth and has children
    if (hasChildren && childrenCount > 0) {
      for (let i = 0; i < childrenCount; i++) {
        const childNode = this.createOrganizationNode(filterType, orgNode, currentDepth + 1, maxDepth);
        orgNode.children!.push(childNode);
      }
    }

    return orgNode;
  }

  private generateOrganizationName(filterType: FilterType): string {
    const prefix = filterType.split(' ')[0];
    const part1 = this.getRandomItem(this.organizationNames[0]);
    const part2 = this.getRandomItem(this.organizationNames[1]);
    const part3 = this.getRandomItem(this.organizationNames[2]);
    const number = this.randomBetween(1, 99);
    
    return `${prefix}${part2}${part1}${number}`;
  }

  private generatePersonName(): string {
    const firstName = this.getRandomItem(this.personNames.firstNames);
    const lastName = this.getRandomItem(this.personNames.lastNames);
    return `${firstName} ${lastName}`;
  }

  // Flatten hierarchy for easier searching/filtering
  flattenHierarchy(nodes: HierarchyNode[], result: HierarchyNode[] = []): HierarchyNode[] {
    nodes.forEach(node => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        this.flattenHierarchy(node.children, result);
      }
    });
    return result;
  }

  // Search functionality
  searchNodes(nodes: HierarchyNode[], searchText: string): HierarchyNode[] {
    if (!searchText || searchText.trim() === '') return nodes;
    
    const searchLower = searchText.toLowerCase();
    return this.searchNodesRecursively(nodes, searchLower);
  }

  private searchNodesRecursively(nodes: HierarchyNode[], searchText: string): HierarchyNode[] {
    const results: HierarchyNode[] = [];
    
    nodes.forEach(node => {
      const nodeMatches = 
        node.name.toLowerCase().includes(searchText) ||
        (node.partyId && node.partyId.toLowerCase().includes(searchText)) ||
        (node.type && node.type.toLowerCase().includes(searchText));
      
      const searchedChildren = node.children ? this.searchNodesRecursively(node.children, searchText) : [];
      
      if (nodeMatches || searchedChildren.length > 0) {
        const clonedNode = { ...node, children: searchedChildren };
        results.push(clonedNode);
      }
    });
    
    return results;
  }

  // Filter functionality
  filterNodes(nodes: HierarchyNode[], filters: FilterCriteria[]): HierarchyNode[] {
    if (!filters || filters.length === 0) return nodes;
    
    return this.filterNodesRecursively(nodes, filters);
  }

  private filterNodesRecursively(nodes: HierarchyNode[], filters: FilterCriteria[]): HierarchyNode[] {
    const filtered: HierarchyNode[] = [];
    
    nodes.forEach(node => {
      const nodeMatches = this.nodeMatchesFilters(node, filters);
      const filteredChildren = node.children ? this.filterNodesRecursively(node.children, filters) : [];
      
      if (nodeMatches || filteredChildren.length > 0) {
        const clonedNode = { ...node, children: filteredChildren };
        filtered.push(clonedNode);
      }
    });
    
    return filtered;
  }

  private nodeMatchesFilters(node: HierarchyNode, filters: FilterCriteria[]): boolean {
    return filters.every(filter => {
      const nodeValue = (node as any)[filter.column];
      const filterValue = filter.value;
      
      if (!nodeValue) return false;
      
      switch (filter.operator) {
        case 'equals':
          return nodeValue === filterValue;
        case 'contains':
          return String(nodeValue).toLowerCase().includes(String(filterValue).toLowerCase());
        default:
          return true;
      }
    });
  }

  // Get expanded state
  getExpandedNodeIds(nodes: HierarchyNode[], expandedIds: Set<string> = new Set()): Set<string> {
    nodes.forEach(node => {
      if (node.expanded && node.partyId) {
        expandedIds.add(node.partyId);
      }
      if (node.children) {
        this.getExpandedNodeIds(node.children, expandedIds);
      }
    });
    return expandedIds;
  }

  // Utility methods
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}