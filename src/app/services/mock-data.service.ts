import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { HierarchyNode, HierarchyRequest, HierarchyResponse, FilterType, FilterCriteria, HierarchyLevel, HierarchyType } from '../models/financial-data.interface';

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

  // Available metric keys that can be generated
  private availableMetricKeys = [
    'Revenue',
    'Profit Margin %',
    'Risk Score',
    'Compliance Rate %',
    'Growth %',
    'Operating Costs',
    'Net Income',
    'ROE %',
    'Customer Count',
    'Market Share %'
  ];

  // Error simulation settings (for testing purposes)
  private errorSimulationEnabled = false;
  private errorRate = 0.2; // 20% chance of error when enabled

  // Available hierarchy levels configuration
  private hierarchyLevels: HierarchyLevel[] = [
    {
      id: 'UPM_L1_NAME',
      name: 'Service Area',
      description: 'Primary business service area',
      enabled: true,
      order: 0
    },
    {
      id: 'CLIENT_OWNER_NAME',
      name: 'Client Owner',
      description: 'Client relationship owner',
      enabled: false,
      order: 1
    },
    {
      id: 'CRM_CLIENT_TYPE',
      name: 'CRM Client Type',
      description: 'ECAL/MCAL Client Type',
      enabled: false,
      order: 2
    }
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

  private clientOwners = [
    'Adam Tessler', 'Sarah Mitchell', 'Michael Chen', 'Emily Rodriguez', 'David Park',
    'Jessica Thompson', 'Robert Kim', 'Lisa Wang', 'James Anderson', 'Mary Singh'
  ];

  private crmClientTypes = [
    'ECAL - Enterprise Client',
    'ECAL - Strategic Account',
    'ECAL - Key Account',
    'MCAL - Mid-Market Client',
    'MCAL - Growth Account',
    'MCAL - Standard Account'
  ];

  private nodeIdCounter = 0;

  // Public method to get available hierarchy levels
  getHierarchyLevels(): HierarchyLevel[] {
    return [...this.hierarchyLevels];
  }

  // Get hierarchy level by ID
  getHierarchyLevelById(id: string): HierarchyLevel | undefined {
    return this.hierarchyLevels.find(level => level.id === id);
  }

  // Get available hierarchy types
  getHierarchyTypes(): Observable<HierarchyType[]> {
    const hierarchyTypes: HierarchyType[] = [
      { hierarchyTypeCode: "G004", groupDescText: "Standard Client Hierarchy" },
      { hierarchyTypeCode: "G002", groupDescText: "Regional Client Hierarchy" },
      { hierarchyTypeCode: "G003", groupDescText: "Service-based Client Hierarchy" },
      { hierarchyTypeCode: "G001", groupDescText: "Product-based Client Hierarchy" },
      { hierarchyTypeCode: "G005", groupDescText: "Risk-based Client Hierarchy" }
    ];
    
    const randomDelay = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
    return of(hierarchyTypes).pipe(delay(randomDelay));
  }

  generateHierarchicalData(request: HierarchyRequest): Observable<HierarchyResponse> {
    // Simulate API errors if enabled
    if (this.errorSimulationEnabled && Math.random() < this.errorRate) {
      return this.simulateApiError().pipe(delay(1000));
    }

    // Randomly select 3-5 metrics for this data set
    const metricCount = this.randomBetween(3, 5);
    const selectedMetrics = this.getRandomItems(this.availableMetricKeys, metricCount);
    
    // Create root as a HierarchyNode
    const root: HierarchyNode = {
      name: 'root',
      type: 'ROOT',
      children: [],
      expanded: true,
      hasChildren: true,
      childrenCount: 0,
      values: this.generateMetrics(selectedMetrics, 'ROOT'),
      selfAccountCount: 0,
      childrenAccountCount: 0
    };

    // If rootPartyId is provided, generate children for that specific node
    if (request.rootPartyId) {
      root.children = this.generateChildrenForNode(request.rootPartyId, request.maxDepth, selectedMetrics);
    } else {
      // Generate hierarchy based on filter order
      if (request.filters.length > 0) {
        root.children = this.generateMultiLevelHierarchy(request.filters, request.maxDepth, selectedMetrics);
      }
    }
    
    // Update children count and account counts
    root.childrenCount = root.children!.length;
    root.childrenAccountCount = this.calculateChildrenAccountCount(root);
    
    const response: HierarchyResponse = {
      root: root,
      metricKeys: selectedMetrics
    };

    // Simulate loading delay with random duration between 500ms and 5 seconds
    const randomDelay = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
    return of(response).pipe(delay(randomDelay));
  }

  private generateChildrenForNode(parentId: string, maxDepth: number, metricKeys: string[]): HierarchyNode[] {
    // Extract filter type from parentId (simplified logic)
    const filterType = this.extractFilterTypeFromParentId(parentId);
    
    // Generate children for the specific node
    const childrenCount = this.randomBetween(2, 6);
    const children: HierarchyNode[] = [];
    
    for (let i = 0; i < childrenCount; i++) {
      const childNode = this.createOrganizationNode(filterType, {} as HierarchyNode, 1, maxDepth, metricKeys);
      // Make sure childNode has proper account counts
      if (!childNode.selfAccountCount) {
        childNode.selfAccountCount = childNode.type === 'PER' ? this.randomBetween(1, 10) : this.randomBetween(5, 50);
      }
      if (childNode.children && childNode.children.length > 0) {
        childNode.childrenAccountCount = this.calculateChildrenAccountCount(childNode);
      }
      children.push(childNode);
    }
    
    return children;
  }
  
  private extractFilterTypeFromParentId(parentId: string): FilterType {
    // Simple logic to extract filter type from parentId
    // In a real implementation, this would query the backend
    if (parentId.includes('Asset')) return 'Asset Servicing';
    if (parentId.includes('Corporate')) return 'Corporate Trust';
    if (parentId.includes('Credit')) return 'Credit Services';
    if (parentId.includes('Depository')) return 'Depository Receipts';
    if (parentId.includes('Markets')) return 'Markets';
    if (parentId.includes('Treasury')) return 'Treasury Services';
    return 'Other';
  }

  private generateMultiLevelHierarchy(filters: string[], maxDepth: number, metricKeys: string[]): HierarchyNode[] {
    const firstFilter = filters[0];
    
    if (firstFilter === 'UPM_L1_NAME') {
      return this.filterTypes.map(filterType => 
        this.createUpmFilterNode(filterType, filters, maxDepth, 0, metricKeys)
      );
    } else if (firstFilter === 'CLIENT_OWNER_NAME') {
      return this.clientOwners.map(clientOwner => 
        this.createClientOwnerFilterNode(clientOwner, filters, maxDepth, 0, metricKeys)
      );
    } else if (firstFilter === 'CRM_CLIENT_TYPE') {
      return this.crmClientTypes.map(clientType => 
        this.createCrmClientTypeFilterNode(clientType, filters, maxDepth, 0, metricKeys)
      );
    }
    
    return [];
  }

  private createUpmFilterNode(filterType: FilterType, filters: string[], maxDepth: number, currentLevel: number, metricKeys: string[]): HierarchyNode {
    const filterNode: HierarchyNode = {
      name: filterType,
      type: `FILTER/${filters[currentLevel]}`,
      filters: [`${filters[currentLevel]}/${filterType}`],
      children: [],
      expanded: false,
      values: this.generateMetrics(metricKeys, 'FILTER'),
      selfAccountCount: this.randomBetween(50, 200),
      childrenAccountCount: 0
    };

    if (currentLevel + 1 < filters.length && currentLevel + 1 < maxDepth) {
      // Create next level filters
      const nextFilter = filters[currentLevel + 1];
      if (nextFilter === 'CLIENT_OWNER_NAME') {
        const clientCount = this.randomBetween(2, 4);
        for (let i = 0; i < clientCount; i++) {
          const clientOwner = this.getRandomItem(this.clientOwners);
          const clientNode = this.createClientOwnerFilterNode(
            clientOwner, 
            filters, 
            maxDepth, 
            currentLevel + 1,
            metricKeys,
            [`${filters[currentLevel]}/${filterType}`]
          );
          filterNode.children!.push(clientNode);
        }
      } else if (nextFilter === 'CRM_CLIENT_TYPE') {
        const crmTypeCount = this.randomBetween(2, 4);
        for (let i = 0; i < crmTypeCount; i++) {
          const crmType = this.getRandomItem(this.crmClientTypes);
          const crmNode = this.createCrmClientTypeFilterNode(
            crmType, 
            filters, 
            maxDepth, 
            currentLevel + 1,
            metricKeys,
            [`${filters[currentLevel]}/${filterType}`]
          );
          filterNode.children!.push(crmNode);
        }
      }
    } else if (currentLevel + 1 < maxDepth) {
      // Create organizations and persons
      // For level 1, generate at least 500 nodes total (70+ per filter type)
      const orgCount = currentLevel === 0 ? this.randomBetween(170, 185) : this.randomBetween(3, 8);
      for (let i = 0; i < orgCount; i++) {
        const orgNode = this.createOrganizationNode(filterType, filterNode, currentLevel + 1, maxDepth, metricKeys);
        filterNode.children!.push(orgNode);
      }
    }

    filterNode.childrenCount = filterNode.children!.length;
    filterNode.hasChildren = filterNode.children!.length > 0;
    
    // Calculate childrenAccountCount by summing up from children
    filterNode.childrenAccountCount = this.calculateChildrenAccountCount(filterNode);
    
    return filterNode;
  }

  private createClientOwnerFilterNode(clientOwner: string, filters: string[], maxDepth: number, currentLevel: number, metricKeys: string[], parentFilters?: string[]): HierarchyNode {
    const allFilters = parentFilters ? 
      [...parentFilters, `${filters[currentLevel]}/${clientOwner}`] : 
      [`${filters[currentLevel]}/${clientOwner}`];

    const filterNode: HierarchyNode = {
      name: clientOwner,
      type: `FILTER/${filters[currentLevel]}`,
      filters: allFilters,
      children: [],
      expanded: false,
      values: this.generateMetrics(metricKeys, 'FILTER'),
      selfAccountCount: this.randomBetween(50, 200),
      childrenAccountCount: 0
    };

    if (currentLevel + 1 < filters.length && currentLevel + 1 < maxDepth) {
      // Create next level filters
      const nextFilter = filters[currentLevel + 1];
      if (nextFilter === 'UPM_L1_NAME') {
        const serviceCount = this.randomBetween(2, 4);
        const selectedServices = this.getRandomItems(this.filterTypes, serviceCount);
        for (const filterType of selectedServices) {
          const serviceNode = this.createUpmFilterNode(
            filterType, 
            filters, 
            maxDepth, 
            currentLevel + 1,
            metricKeys
          );
          // Update filters to include parent context
          serviceNode.filters = [...allFilters, `${filters[currentLevel + 1]}/${filterType}`];
          filterNode.children!.push(serviceNode);
        }
      } else if (nextFilter === 'CRM_CLIENT_TYPE') {
        const crmTypeCount = this.randomBetween(2, 3);
        const selectedCrmTypes = this.getRandomItems(this.crmClientTypes, crmTypeCount);
        for (const crmType of selectedCrmTypes) {
          const crmNode = this.createCrmClientTypeFilterNode(
            crmType, 
            filters, 
            maxDepth, 
            currentLevel + 1,
            allFilters
          );
          filterNode.children!.push(crmNode);
        }
      }
    } else if (currentLevel + 1 < maxDepth) {
      // Create organizations and persons
      const orgCount = this.randomBetween(2, 5);
      for (let i = 0; i < orgCount; i++) {
        const orgNode = this.createOrganizationNode('Asset Servicing', filterNode, currentLevel + 1, maxDepth, metricKeys);
        filterNode.children!.push(orgNode);
      }
    }

    filterNode.childrenCount = filterNode.children!.length;
    filterNode.hasChildren = filterNode.children!.length > 0;
    
    // Calculate childrenAccountCount by summing up from children
    filterNode.childrenAccountCount = this.calculateChildrenAccountCount(filterNode);
    
    return filterNode;
  }

  private createCrmClientTypeFilterNode(crmClientType: string, filters: string[], maxDepth: number, currentLevel: number, metricKeys: string[], parentFilters?: string[]): HierarchyNode {
    const allFilters = parentFilters ? 
      [...parentFilters, `${filters[currentLevel]}/${crmClientType}`] : 
      [`${filters[currentLevel]}/${crmClientType}`];

    const filterNode: HierarchyNode = {
      name: crmClientType,
      type: `FILTER/${filters[currentLevel]}`,
      filters: allFilters,
      children: [],
      expanded: false,
      values: this.generateMetrics(metricKeys, 'FILTER'),
      selfAccountCount: this.randomBetween(50, 200),
      childrenAccountCount: 0
    };

    if (currentLevel + 1 < filters.length && currentLevel + 1 < maxDepth) {
      // Create next level filters
      const nextFilter = filters[currentLevel + 1];
      if (nextFilter === 'UPM_L1_NAME') {
        const serviceCount = this.randomBetween(2, 3);
        const selectedServices = this.getRandomItems(this.filterTypes, serviceCount);
        for (const filterType of selectedServices) {
          const serviceNode = this.createUpmFilterNode(
            filterType, 
            filters, 
            maxDepth, 
            currentLevel + 1,
            metricKeys
          );
          // Update filters to include parent context
          serviceNode.filters = [...allFilters, `${filters[currentLevel + 1]}/${filterType}`];
          filterNode.children!.push(serviceNode);
        }
      } else if (nextFilter === 'CLIENT_OWNER_NAME') {
        const clientCount = this.randomBetween(2, 3);
        const selectedClients = this.getRandomItems(this.clientOwners, clientCount);
        for (const clientOwner of selectedClients) {
          const clientNode = this.createClientOwnerFilterNode(
            clientOwner, 
            filters, 
            maxDepth, 
            currentLevel + 1,
            metricKeys,
            allFilters
          );
          filterNode.children!.push(clientNode);
        }
      }
    } else if (currentLevel + 1 < maxDepth) {
      // Create organizations and persons
      const orgCount = this.randomBetween(3, 6);
      for (let i = 0; i < orgCount; i++) {
        const orgNode = this.createOrganizationNode('Asset Servicing', filterNode, currentLevel + 1, maxDepth, metricKeys);
        filterNode.children!.push(orgNode);
      }
    }

    filterNode.childrenCount = filterNode.children!.length;
    filterNode.hasChildren = filterNode.children!.length > 0;
    
    // Calculate childrenAccountCount by summing up from children
    filterNode.childrenAccountCount = this.calculateChildrenAccountCount(filterNode);
    
    return filterNode;
  }

  private createFilterNode(filterType: FilterType, filterName: string, maxDepth: number, metricKeys: string[]): HierarchyNode {
    const filterNode: HierarchyNode = {
      name: filterType,
      type: 'FILTER',
      filters: [`${filterName}/${filterType}`],
      children: [],
      expanded: false,
      values: this.generateMetrics(metricKeys, 'FILTER'),
      selfAccountCount: this.randomBetween(50, 200),
      childrenAccountCount: 0
    };

    if (maxDepth > 1) {
      // Generate organization nodes under each filter
      const orgCount = this.randomBetween(3, 8);
      for (let i = 0; i < orgCount; i++) {
        const orgNode = this.createOrganizationNode(filterType, filterNode, 1, maxDepth, metricKeys);
        filterNode.children!.push(orgNode);
      }
    }

    filterNode.childrenCount = filterNode.children!.length;
    filterNode.hasChildren = filterNode.children!.length > 0;
    filterNode.childrenAccountCount = this.calculateChildrenAccountCount(filterNode);

    return filterNode;
  }

  private createOrganizationNode(filterType: FilterType, parent: HierarchyNode, currentDepth: number, maxDepth: number, metricKeys: string[]): HierarchyNode {
    this.nodeIdCounter++;
    const hasChildren = currentDepth < maxDepth;
    const childrenCount = hasChildren ? this.randomBetween(0, 5) : 0;
    const nodeType: 'PER' | 'ORG' = Math.random() > 0.8 ? 'PER' : 'ORG';
    const name = nodeType === 'PER' ? this.generatePersonName() : this.generateOrganizationName(filterType);

    const orgNode: HierarchyNode = {
      name: name,
      type: nodeType,
      partyId: `${filterType.replace(/\s+/g, '')}${nodeType === 'PER' ? 'PER' : 'ACCT'}${this.nodeIdCounter}`,
      childrenCount: childrenCount,
      hasChildren: childrenCount > 0,
      legalEntity: Math.random() > 0.3,
      children: [],
      expanded: false,
      values: this.generateMetrics(metricKeys, nodeType),
      selfAccountCount: nodeType === 'PER' ? this.randomBetween(1, 10) : this.randomBetween(5, 50),
      childrenAccountCount: 0
    };

    // 30% chance to create nodes with lazy loading (hasChildren=true but empty children)
    const shouldLazyLoad = Math.random() < 0.3 && hasChildren && childrenCount > 0;
    
    if (shouldLazyLoad) {
      // Leave children array empty for lazy loading
    } else if (hasChildren && childrenCount > 0) {
      // Generate children immediately
      for (let i = 0; i < childrenCount; i++) {
        const childNode = this.createOrganizationNode(filterType, orgNode, currentDepth + 1, maxDepth, metricKeys);
        orgNode.children!.push(childNode);
      }
    }

    // Calculate childrenAccountCount for org nodes if they have children
    if (orgNode.children && orgNode.children.length > 0) {
      orgNode.childrenAccountCount = this.calculateChildrenAccountCount(orgNode);
    }

    return orgNode;
  }

  private calculateChildrenAccountCount(node: HierarchyNode): number {
    let total = 0;
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        // Add child's self account count
        total += child.selfAccountCount || 0;
        // Add child's children account count
        total += child.childrenAccountCount || 0;
      });
    }
    
    return total;
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

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateMetrics(metricKeys: string[], nodeType: string): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    metricKeys.forEach(key => {
      if (key.includes('%')) {
        // Percentage values
        metrics[key] = Math.round(Math.random() * 100 * 10) / 10; // 0.0 to 100.0
      } else if (key.includes('Revenue') || key.includes('Income') || key.includes('Costs')) {
        // Financial values - higher for organizations, lower for persons
        const base = nodeType === 'PER' ? 100000 : 1000000;
        const multiplier = nodeType === 'FILTER' || nodeType === 'ROOT' ? 10 : 1;
        metrics[key] = Math.round(Math.random() * base * multiplier);
      } else if (key.includes('Score')) {
        // Score values (0-100)
        metrics[key] = Math.round(Math.random() * 100);
      } else if (key.includes('Count')) {
        // Count values
        const max = nodeType === 'FILTER' || nodeType === 'ROOT' ? 10000 : nodeType === 'ORG' ? 1000 : 100;
        metrics[key] = Math.round(Math.random() * max);
      } else {
        // Default numeric value
        metrics[key] = Math.round(Math.random() * 1000 * 10) / 10;
      }
    });
    
    return metrics;
  }

  // Error simulation methods
  private simulateApiError(): Observable<never> {
    const errorTypes = [
      { status: 500, message: 'Internal Server Error' },
      { status: 503, message: 'Service Unavailable' },
      { status: 0, message: 'Network Error' },
      { status: 408, message: 'Request Timeout' },
      { status: 502, message: 'Bad Gateway' }
    ];

    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    return throwError(() => randomError);
  }

  // Public methods for controlling error simulation (for testing/development)
  enableErrorSimulation(enabled: boolean = true): void {
    this.errorSimulationEnabled = enabled;
  }

  setErrorRate(rate: number): void {
    this.errorRate = Math.max(0, Math.min(1, rate)); // Clamp between 0 and 1
  }

  isErrorSimulationEnabled(): boolean {
    return this.errorSimulationEnabled;
  }

  getErrorRate(): number {
    return this.errorRate;
  }

  // Force an error for testing
  forceError(errorType: 'network' | 'server' | 'timeout' = 'server'): Observable<never> {
    let error: any;
    switch (errorType) {
      case 'network':
        error = { status: 0, message: 'Network Error' };
        break;
      case 'server':
        error = { status: 500, message: 'Internal Server Error' };
        break;
      case 'timeout':
        error = { status: 408, message: 'Request Timeout' };
        break;
    }
    return throwError(() => error).pipe(delay(1000));
  }
}