# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UCM is a hierarchical financial data dashboard built with Angular 20 and TypeScript. The application displays hierarchical organization/person data with advanced filtering, searching, and performance optimizations for handling large datasets.

## Essential Commands

### Development
```bash
npm start          # Start dev server on http://localhost:4200
npm run build      # Build for production
npm run watch      # Build with file watching
npm test           # Run unit tests with Karma/Jasmine
```

### Code Quality
```bash
# No linting configured yet - consider adding ESLint/Angular ESLint
# No formatting script - Prettier is installed but not configured as npm script
```

## Architecture

### Technology Stack
- **Framework**: Angular 20 with standalone components
- **Language**: TypeScript 5.8 with strict mode
- **Styling**: SCSS with CSS variables for theming
- **Testing**: Karma + Jasmine
- **Build**: Angular CLI with esbuild
- **Virtual Scrolling**: Angular CDK

### Key Architectural Decisions
1. **Standalone Components**: No NgModules, using modern Angular approach
2. **Strict TypeScript**: Full strict mode enabled for type safety
3. **Component Structure**: Components should be self-contained with .ts, .html, .scss, and .spec.ts files
4. **Signal-based State**: Using Angular signals for reactive state management

### Project Structure
```
src/app/
├── components/          
│   ├── dashboard/      # Main dashboard component
│   ├── data-grid/      # Hierarchical data grid with virtual scrolling
│   ├── filter-bar/     # Filter controls
│   ├── header/         # App header with theme toggle
│   ├── hierarchy-selector/ # Hierarchy configuration component
│   ├── hierarchy-config-modal/ # Root-level modal for hierarchy configuration
│   └── progress-bar/   # Reusable loading progress bar
├── services/           
│   ├── mock-data.service.ts     # Generates hierarchical data (returns Observable)
│   ├── theme.service.ts         # Theme management
│   └── hierarchy-modal.service.ts # Global modal state management
├── models/             
│   └── financial-data.interface.ts  # Data structures
└── app.ts              # Root component
```

## Current Data Structure

### Hierarchy Request/Response
```typescript
interface HierarchyRequest {
  filters: string[];        // e.g., ['UPM_L1_NAME']
  hierarchyTypeCode: string; // e.g., 'G001'
  maxDepth: number;         // Controls tree depth
}

interface HierarchyNode {
  name: string;
  type: 'FILTER' | 'ORG' | 'PERSON';
  filters?: string[];       // e.g., ['UPM_L1_NAME/Asset Servicing']
  partyId?: string;
  childrenCount?: number;
  hasChildren?: boolean;
  legalEntity?: boolean;
  children?: HierarchyNode[];
  expanded?: boolean;
  level?: number;
  parent?: HierarchyNode;
}
```

### Filter Types
- Asset Servicing
- Corporate Trust
- Credit Services
- Depository Receipts (note: spelled as "Depository" not "Depositry")
- Markets
- Other
- Treasury Services

## Key Components

### Data Grid Component
- Displays hierarchical data with expand/collapse
- Virtual scrolling for performance
- Async data loading with progress bar integration
- Self-managed data loading via `loadData()` and `reloadWithNewHierarchy()` methods
- Column definitions:
  - Name (with hierarchy indentation, type icons, legal entity icons)
  - Type (FILTER/ORG/PERSON)
  - Party ID
  - Legal Entity (boolean)
  - Children Count
- Supports sorting and column resizing (resize doesn't trigger sort)
- Row/cell click events
- Context menu with "Refresh Children" and "Change Hierarchy" options
- Visual differentiation: filter rows have subtle background coloring
- Iconography: type icons (filter/org/person) and legal entity status (checkmark/X)
- Loading states during hierarchy configuration changes
- Node-specific hierarchy configuration via modal service

### Filter Bar Component
- Search by name or party ID
- Clear all functionality
- Compact hierarchy selector in header with click-to-expand configuration
- Shows current selected hierarchy and max depth in header
- Uses modal service for hierarchy configuration

### Hierarchy Selector Component
- Dual-mode display: compact in header, full configuration in modal
- Drag-and-drop reordering with Angular CDK
- Active/inactive hierarchy configuration
- Integrated max depth selector
- Apply/Cancel workflow for configuration changes
- Pending configuration state - changes applied only on Apply button click
- Preview functionality shows configuration before applying
- Compact mode triggers modal service for configuration
- Modal mode supports node-specific hierarchy configuration

### Mock Data Service
- Returns Observable<HierarchyResponse> for async data loading
- Generates hierarchical data based on request parameters
- Creates organizations and persons under filter types
- Supports search and filtering
- Maintains parent-child relationships
- Simulates random network delay (500ms-5s) for realistic loading experience

### Progress Bar Component
- Reusable loading component
- Configurable message and show/hide state
- Rotating message sequence during loading (baking, loading, transferring, etc.)
- Indeterminate animation that doesn't complete until data is loaded
- Used during async data operations

### Hierarchy Config Modal Component
- Root-level modal component to bypass CSS stacking context issues
- Renders at app root level with z-index: 2000
- Uses HierarchyModalService for global state management
- Supports both filter-bar and node-specific hierarchy configuration
- Animated overlay with blur backdrop and slide-up animation

### Hierarchy Modal Service
- Global service for managing hierarchy configuration modal state
- Signal-based reactive state management
- Handles opening/closing modal with configuration data
- Supports callback pattern for configuration changes
- Enables node-specific hierarchy configuration with context

## Styling Approach
- Uses CSS custom properties for theming
- Dark/light theme support via ThemeService
- Gradient-based modern UI design
- Hover effects and transitions
- Special styling for different node types:
  - FILTER: Accent color, uppercase, bold
  - ORG: Primary text color
  - PERSON: Secondary color, italic

## Performance Considerations
- Virtual scrolling implemented for large datasets
- Computed signals for efficient data transformation
- Debounced search input (300ms)
- Flattened data structure for virtual scroll

## Recent Changes (Session Summary)
1. **Random Delay Implementation**: Updated MockDataService to use random delay (500ms-5s) for realistic loading simulation
2. **Progress Bar Enhancement**: Added rotating message sequence with indeterminate animation that doesn't complete until data is loaded
3. **Context Menu**: Added "Change Hierarchy" option to data grid row context menu for node-specific hierarchy configuration
4. **Root-Level Modal Architecture**: Created HierarchyConfigModalComponent to render at app root level, bypassing CSS stacking context issues
5. **Modal Service Pattern**: Implemented HierarchyModalService for global modal state management using Angular signals
6. **Z-Index Issue Resolution**: Fixed modal appearing behind header by rendering at root level with z-index: 2000
7. **Integrated Max Depth**: Moved max depth selector into hierarchy-selector component for unified configuration
8. **Node-Specific Hierarchy**: Enabled per-node hierarchy configuration with context information and callback patterns
9. **Improved Component Architecture**: Separated modal concerns from inline overlays for better maintainability
10. **Service-Based Modal Management**: Replaced inline modal implementations with centralized service approach

## Next Steps/TODO
- Add error handling for data loading
- Implement lazy loading for deep hierarchies
- Add loading states during data fetching
- Consider implementing data persistence
- Add unit tests for new functionality
- Optimize performance for very large datasets (100K+ nodes)

## Known Issues
- None currently identified in latest implementation

## Development Notes
1. Always check for undefined values when accessing optional properties
2. Use type guards when working with union types (FILTER|ORG|PERSON)
3. Maintain parent references carefully when building hierarchies
4. Virtual scrolling requires flattened data - use flattenHierarchy method
5. Column resize functionality properly prevents sorting during resize operations
6. Search functionality works across name, partyId, and type fields
7. **IMPORTANT**: Level property is calculated dynamically in data-grid component's flattenData() method, not generated by mock service
8. Hierarchy indentation is achieved using calculated level * 20px padding
9. **Async Operations**: All data loading should use Observable patterns with proper loading states
10. **Event Handling**: Use event.stopPropagation() and timing controls to prevent event conflicts
11. **Visual Hierarchy**: Filter rows use subtle background colors, iconography shows type and legal status
12. **Component Communication**: Use @Input/@Output patterns for parent-child communication
13. **Configuration Management**: Use pending state pattern for configuration changes with Apply/Cancel workflow
14. **Data Grid Patterns**: Use ViewChild to access data grid methods for triggering reloads
15. **Loading States**: Show progress indicators during data reload operations to provide user feedback
16. **Modal Management**: Use HierarchyModalService for all modal operations to avoid CSS stacking context issues
17. **Z-Index Layering**: Root-level modals should use z-index: 2000+ to appear above all other components
18. **Progress Animation**: Use indeterminate animations that don't complete until actual data loading is finished
19. **Service Patterns**: Prefer service-based state management over component-level state for cross-component communication
20. **Context Menu**: Right-click context menus should provide relevant actions based on node type and capabilities