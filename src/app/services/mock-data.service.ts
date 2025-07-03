import { Injectable } from '@angular/core';
import { DataNode, BankName, ServiceType, SalesPerson, Region } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private banks: BankName[] = ['BNY', 'CITI', 'State Street', 'Goldman Sachs'];
  private services: ServiceType[] = ['Corporate Trust', 'Treasury', 'Custody'];
  private salesPersons: SalesPerson[] = ['Alice', 'Bob', 'Charlie', 'Diana'];
  private regions: Region[] = ['GS Asia', 'GS North America', 'Europe', 'India', 'China', 'USA', 'Canada'];
  
  private accountPrefixes = ['ACC', 'FUND', 'TRUST', 'CORP', 'INVEST'];
  private accountSuffixes = ['GLOBAL', 'INTL', 'CAPITAL', 'HOLDINGS', 'PARTNERS'];
  
  private nodeCounter = 0;

  generateMockData(count: number = 10000): DataNode[] {
    this.nodeCounter = 0;
    const hierarchicalData: DataNode[] = [];
    
    // Create bank-based hierarchy
    this.banks.forEach(bank => {
      const bankNode = this.createBankNode(bank);
      hierarchicalData.push(bankNode);
      
      // Add region nodes under banks
      const regionCount = this.randomBetween(2, 4);
      const selectedRegions = this.getRandomItems(this.regions, regionCount);
      
      selectedRegions.forEach(region => {
        const regionNode = this.createRegionNode(region, bankNode);
        bankNode.children = bankNode.children || [];
        bankNode.children.push(regionNode);
        
        // Add account nodes under regions
        const accountCount = Math.floor((count / this.banks.length / regionCount) * 0.8);
        for (let i = 0; i < accountCount && this.nodeCounter < count; i++) {
          const accountNode = this.createAccountNode(regionNode, bank);
          regionNode.children = regionNode.children || [];
          regionNode.children.push(accountNode);
          
          // Occasionally add sub-accounts
          if (Math.random() < 0.3 && this.nodeCounter < count) {
            const subAccountCount = this.randomBetween(1, 3);
            for (let j = 0; j < subAccountCount && this.nodeCounter < count; j++) {
              const subAccount = this.createAccountNode(accountNode, bank, true);
              accountNode.children = accountNode.children || [];
              accountNode.children.push(subAccount);
            }
          }
        }
      });
    });
    
    return hierarchicalData;
  }

  private createBankNode(bankName: BankName): DataNode {
    this.nodeCounter++;
    return {
      id: `bank-${this.nodeCounter}`,
      accountName: bankName,
      bankName: bankName,
      service: 'All Services',
      salesPerson: 'All',
      assetsUnderCustody: 0,
      profitLoss: 0,
      level: 0,
      expanded: false,
      children: []
    };
  }

  private createRegionNode(region: Region, parent: DataNode): DataNode {
    this.nodeCounter++;
    return {
      id: `region-${this.nodeCounter}`,
      accountName: region,
      bankName: parent.bankName,
      service: 'All Services',
      salesPerson: 'All',
      assetsUnderCustody: 0,
      profitLoss: 0,
      level: 1,
      expanded: false,
      children: [],
      parent: parent
    };
  }

  private createAccountNode(parent: DataNode, bankName: BankName, isSubAccount: boolean = false): DataNode {
    this.nodeCounter++;
    const accountName = this.generateAccountName();
    const service = this.getRandomItem(this.services);
    const salesPerson = this.getRandomItem(this.salesPersons);
    const assets = this.randomBetween(1000000, 10000000000);
    const profitLoss = this.randomBetween(-10000000, 10000000);
    
    const node: DataNode = {
      id: `account-${this.nodeCounter}`,
      accountName: isSubAccount ? `${parent.accountName} - ${accountName}` : accountName,
      bankName: bankName,
      service: service,
      salesPerson: salesPerson,
      assetsUnderCustody: assets,
      profitLoss: profitLoss,
      level: parent.level + 1,
      expanded: false,
      parent: parent
    };
    
    // Update parent aggregates
    this.updateParentAggregates(parent, assets, profitLoss);
    
    return node;
  }

  private updateParentAggregates(node: DataNode, assets: number, profitLoss: number): void {
    let current: DataNode | undefined = node;
    while (current) {
      current.assetsUnderCustody += assets;
      current.profitLoss += profitLoss;
      current = current.parent;
    }
  }

  private generateAccountName(): string {
    const prefix = this.getRandomItem(this.accountPrefixes);
    const suffix = this.getRandomItem(this.accountSuffixes);
    const number = this.randomBetween(1000, 9999);
    return `${prefix}-${number} ${suffix}`;
  }

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

  // Filtering and search methods
  filterData(data: DataNode[], filters: any[]): DataNode[] {
    if (!filters || filters.length === 0) return data;
    
    return this.filterNodesRecursively(data, filters);
  }

  private filterNodesRecursively(nodes: DataNode[], filters: any[]): DataNode[] {
    const filtered: DataNode[] = [];
    
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

  private nodeMatchesFilters(node: DataNode, filters: any[]): boolean {
    return filters.every(filter => {
      const nodeValue = (node as any)[filter.column];
      const filterValue = filter.value;
      
      switch (filter.operator) {
        case 'equals':
          return nodeValue === filterValue;
        case 'contains':
          return String(nodeValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'greaterThan':
          return nodeValue > filterValue;
        case 'lessThan':
          return nodeValue < filterValue;
        default:
          return true;
      }
    });
  }

  searchData(data: DataNode[], searchText: string, columns?: string[]): DataNode[] {
    if (!searchText || searchText.trim() === '') return data;
    
    const searchLower = searchText.toLowerCase();
    const searchColumns = columns || ['accountName', 'bankName', 'service', 'salesPerson'];
    
    return this.searchNodesRecursively(data, searchLower, searchColumns);
  }

  private searchNodesRecursively(nodes: DataNode[], searchText: string, columns: string[]): DataNode[] {
    const results: DataNode[] = [];
    
    nodes.forEach(node => {
      const nodeMatches = columns.some(col => {
        const value = (node as any)[col];
        return String(value).toLowerCase().includes(searchText);
      });
      
      const searchedChildren = node.children ? this.searchNodesRecursively(node.children, searchText, columns) : [];
      
      if (nodeMatches || searchedChildren.length > 0) {
        const clonedNode = { ...node, children: searchedChildren };
        results.push(clonedNode);
      }
    });
    
    return results;
  }

  // Hierarchy reshaping methods
  reshapeByHierarchy(data: DataNode[], hierarchyType: 'salesPerson' | 'service', groupBy?: string): DataNode[] {
    const flatData = this.flattenData(data);
    
    if (hierarchyType === 'salesPerson') {
      return this.groupBySalesPerson(flatData, groupBy);
    } else if (hierarchyType === 'service') {
      return this.groupByService(flatData, groupBy);
    }
    
    return data;
  }

  private flattenData(nodes: DataNode[], result: DataNode[] = []): DataNode[] {
    nodes.forEach(node => {
      if (!node.children || node.children.length === 0) {
        result.push({ ...node, children: undefined, parent: undefined });
      }
      if (node.children) {
        this.flattenData(node.children, result);
      }
    });
    return result;
  }

  private groupBySalesPerson(flatData: DataNode[], specificPerson?: string): DataNode[] {
    const grouped: Map<string, DataNode> = new Map();
    const persons = specificPerson ? [specificPerson] : this.salesPersons;
    
    persons.forEach(person => {
      const personNode: DataNode = {
        id: `sp-${person}`,
        accountName: person,
        bankName: 'All Banks',
        service: 'All Services',
        salesPerson: person,
        assetsUnderCustody: 0,
        profitLoss: 0,
        level: 0,
        expanded: false,
        children: []
      };
      grouped.set(person, personNode);
    });
    
    flatData.forEach(account => {
      if (specificPerson && account.salesPerson !== specificPerson) return;
      
      const personNode = grouped.get(account.salesPerson);
      if (personNode) {
        const bankGroup = this.findOrCreateBankGroup(personNode, account.bankName);
        bankGroup.children = bankGroup.children || [];
        bankGroup.children.push({
          ...account,
          level: 2,
          parent: bankGroup
        });
        
        // Update aggregates
        bankGroup.assetsUnderCustody += account.assetsUnderCustody;
        bankGroup.profitLoss += account.profitLoss;
        personNode.assetsUnderCustody += account.assetsUnderCustody;
        personNode.profitLoss += account.profitLoss;
      }
    });
    
    return Array.from(grouped.values()).filter(node => node.children && node.children.length > 0);
  }

  private groupByService(flatData: DataNode[], specificService?: string): DataNode[] {
    const grouped: Map<string, DataNode> = new Map();
    const services = specificService ? [specificService as ServiceType] : this.services;
    
    services.forEach(service => {
      const serviceNode: DataNode = {
        id: `svc-${service}`,
        accountName: service,
        bankName: 'All Banks',
        service: service,
        salesPerson: 'All',
        assetsUnderCustody: 0,
        profitLoss: 0,
        level: 0,
        expanded: false,
        children: []
      };
      grouped.set(service, serviceNode);
    });
    
    flatData.forEach(account => {
      if (specificService && account.service !== specificService) return;
      
      const serviceNode = grouped.get(account.service);
      if (serviceNode) {
        const bankGroup = this.findOrCreateBankGroup(serviceNode, account.bankName);
        bankGroup.children = bankGroup.children || [];
        bankGroup.children.push({
          ...account,
          level: 2,
          parent: bankGroup
        });
        
        // Update aggregates
        bankGroup.assetsUnderCustody += account.assetsUnderCustody;
        bankGroup.profitLoss += account.profitLoss;
        serviceNode.assetsUnderCustody += account.assetsUnderCustody;
        serviceNode.profitLoss += account.profitLoss;
      }
    });
    
    return Array.from(grouped.values()).filter(node => node.children && node.children.length > 0);
  }

  private findOrCreateBankGroup(parent: DataNode, bankName: string): DataNode {
    if (!parent.children) {
      parent.children = [];
    }
    
    let bankGroup = parent.children.find(child => child.bankName === bankName && child.level === 1);
    
    if (!bankGroup) {
      bankGroup = {
        id: `${parent.id}-${bankName}`,
        accountName: bankName,
        bankName: bankName,
        service: parent.service,
        salesPerson: parent.salesPerson,
        assetsUnderCustody: 0,
        profitLoss: 0,
        level: 1,
        expanded: false,
        children: [],
        parent: parent
      };
      parent.children.push(bankGroup);
    }
    
    return bankGroup;
  }

  // Get top N records by assets
  getTopRecords(data: DataNode[], count: number): DataNode[] {
    const flatData = this.flattenData(data);
    const sorted = flatData.sort((a, b) => b.assetsUnderCustody - a.assetsUnderCustody);
    return sorted.slice(0, count);
  }

  // Reconstruct bank hierarchy from flat data
  reconstructBankHierarchy(flatData: DataNode[]): DataNode[] {
    const bankMap: Map<string, DataNode> = new Map();
    const regionMap: Map<string, Map<string, DataNode>> = new Map();
    
    // First pass: organize by bank and region
    flatData.forEach(account => {
      const bankName = account.bankName;
      
      // Get or create bank node
      if (!bankMap.has(bankName)) {
        bankMap.set(bankName, {
          id: `bank-${bankName}`,
          accountName: bankName,
          bankName: bankName,
          service: 'All Services',
          salesPerson: 'All',
          assetsUnderCustody: 0,
          profitLoss: 0,
          level: 0,
          expanded: false,
          children: []
        });
        regionMap.set(bankName, new Map());
      }
      
      const bank = bankMap.get(bankName)!;
      const bankRegions = regionMap.get(bankName)!;
      
      // Determine region based on account name pattern or bank
      const region = this.determineRegion(bankName, account.accountName);
      
      // Get or create region node
      if (!bankRegions.has(region)) {
        const regionNode: DataNode = {
          id: `${bankName}-${region}`,
          accountName: region,
          bankName: bankName,
          service: 'All Services',
          salesPerson: 'All',
          assetsUnderCustody: 0,
          profitLoss: 0,
          level: 1,
          expanded: false,
          children: [],
          parent: bank
        };
        bankRegions.set(region, regionNode);
        bank.children!.push(regionNode);
      }
      
      const regionNode = bankRegions.get(region)!;
      
      // Add account to region
      const accountNode: DataNode = {
        ...account,
        level: 2,
        expanded: false,
        children: undefined,
        parent: regionNode
      };
      regionNode.children!.push(accountNode);
      
      // Update aggregates
      regionNode.assetsUnderCustody += account.assetsUnderCustody;
      regionNode.profitLoss += account.profitLoss;
      bank.assetsUnderCustody += account.assetsUnderCustody;
      bank.profitLoss += account.profitLoss;
    });
    
    // Return sorted banks
    return Array.from(bankMap.values()).sort((a, b) => 
      b.assetsUnderCustody - a.assetsUnderCustody
    );
  }

  private determineRegion(bankName: string, accountName: string): string {
    // Logic to determine region based on bank and account patterns
    if (bankName === 'BNY') {
      if (accountName.includes('Asia')) return 'Asia';
      if (accountName.includes('Europe')) return 'Europe';
      return 'North America';
    } else if (bankName === 'State Street') {
      if (accountName.includes('Asia')) return 'GS Asia';
      if (accountName.includes('Europe')) return 'Europe';
      return 'GS North America';
    } else if (bankName === 'Goldman Sachs') {
      if (accountName.includes('India')) return 'India';
      if (accountName.includes('China')) return 'China';
      return 'USA';
    } else if (bankName === 'CITI') {
      if (accountName.includes('Canada')) return 'Canada';
      if (accountName.includes('USA')) return 'USA';
      return 'North America';
    }
    return 'Global';
  }
}