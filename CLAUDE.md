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
│   ├── dashboard/      # Main dashboard component (with tests)
│   │   ├── dashboard.html
│   │   ├── dashboard.scss
│   │   ├── dashboard.spec.ts
│   │   └── dashboard.ts
│   ├── data-grid/      # Hierarchical data grid with virtual scrolling (with tests)
│   │   ├── data-grid.html
│   │   ├── data-grid.scss
│   │   ├── data-grid.spec.ts
│   │   └── data-grid.ts
│   ├── filter-bar/     # Filter controls (with tests)
│   │   ├── filter-bar.html
│   │   ├── filter-bar.scss
│   │   ├── filter-bar.spec.ts
│   │   └── filter-bar.ts
│   ├── header/         # App header with theme toggle (with tests)
│   │   ├── header.html
│   │   ├── header.scss
│   │   ├── header.spec.ts
│   │   └── header.ts
│   ├── search-bar/     # Search functionality component (with tests)
│   │   ├── search-bar.html
│   │   ├── search-bar.scss
│   │   ├── search-bar.spec.ts
│   │   └── search-bar.ts
│   ├── hierarchy-selector/ # Hierarchy configuration component (no tests)
│   │   ├── hierarchy-selector.html
│   │   ├── hierarchy-selector.scss
│   │   └── hierarchy-selector.ts
│   ├── hierarchy-config-modal/ # Root-level modal for hierarchy configuration (no tests)
│   │   ├── hierarchy-config-modal.html
│   │   ├── hierarchy-config-modal.scss
│   │   └── hierarchy-config-modal.ts
│   ├── progress-bar/   # Reusable loading progress bar (no tests)
│   │   ├── progress-bar.html
│   │   ├── progress-bar.scss
│   │   └── progress-bar.ts
│   └── tooltip/        # Tooltip directive and component (no tests)
│       ├── tooltip.directive.ts
│       └── tooltip.ts
├── services/           
│   ├── mock-data.service.ts     # Generates hierarchical data (returns Observable)
│   ├── theme.service.ts         # Theme management
│   └── hierarchy-modal.service.ts # Global modal state management
├── models/             
│   ├── financial-data.interface.ts  # Data structures
│   └── index.ts                     # Barrel export
├── app.config.ts       # App configuration
├── app.html            # Root component template
├── app.routes.ts       # Route configuration
├── app.scss            # Root component styles
├── app.spec.ts         # Root component tests
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
  type: 'FILTER' | 'ORG' | 'PER';
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
  - Type (FILTER/ORG/PER)
  - Party ID
  - Legal Entity (boolean)
  - Children Count
- Supports sorting and column resizing (resize doesn't trigger sort)
- Row/cell click events
- Context menu with "Refresh Children", "Change Hierarchy", and "Search Children" options
- Visual differentiation: filter rows have subtle background coloring
- Iconography: type icons (filter/org/person) and legal entity status (checkmark/X)
- Loading states during hierarchy configuration changes
- Node-specific hierarchy configuration via modal service
- **Child Search Feature**: 
  - Right-click context menu "Search Children" option
  - Ctrl+F keyboard shortcut when focused on a row with children
  - Inline search bar with input, navigation buttons, and result counter
  - Recursive search through all descendants of selected node
  - Automatic path expansion to show search results
  - Scroll-to-result with virtual scrolling integration
  - Highlight animation (2 seconds) for found results
  - Next/Previous navigation through search results
  - Keyboard navigation (Enter/Arrow keys for navigation, Escape to close)
  - Search by name, party ID, or type across all child nodes

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

### Search Bar Component
- Dedicated search functionality component
- Integrates with filter bar for unified search experience
- Supports searching by name or party ID
- Debounced input for performance optimization

### Tooltip Component
- Reusable tooltip directive and component
- Provides contextual information on hover
- Used throughout the application for enhanced UX

## Styling Approach
- Uses CSS custom properties for theming
- Dark/light theme support via ThemeService
- Gradient-based modern UI design
- Hover effects and transitions
- Special styling for different node types:
  - FILTER: Accent color, uppercase, bold
  - ORG: Primary text color
  - PER: Secondary color, italic

### Color Usage Guidelines
- **NEVER use hardcoded colors** in CSS/SCSS files (e.g., #ffffff, rgba(0,0,0,0.5), rgb(255,255,255))
- **ALWAYS use CSS custom properties** (theme variables) for all colors
- If a new color is needed:
  1. Add it to both light and dark themes in `src/styles.scss`
  2. Use descriptive variable names (e.g., `--info-color`, `--shadow-medium`)
  3. For colors that need rgba() opacity, also add RGB values (e.g., `--accent-color-rgb: 102, 126, 234`)
- Available color categories:
  - Background colors: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
  - Text colors: `--text-primary`, `--text-secondary`, `--text-tertiary`
  - State colors: `--accent-color`, `--success-color`, `--danger-color`, `--warning-color`
  - Shadow colors: `--shadow-light`, `--shadow-medium`, `--shadow-dark`, `--shadow-overlay`
  - Gradient colors: `--gradient-start`, `--gradient-middle`, `--gradient-end`

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
11. **Color System Refactor**: Eliminated all hardcoded colors across SCSS files and replaced with CSS custom properties
12. **Theme Variable Expansion**: Added comprehensive color variables including RGB values, shadows, and gradients for consistent theming
13. **Color Usage Guidelines**: Established strict guidelines for color usage to maintain theme consistency
14. **Child Search Feature**: Implemented comprehensive child search functionality with context menu integration, keyboard shortcuts, and virtual scrolling navigation
15. **UI Polish**: Fixed blinking cursor issue on focusable grid rows using `caret-color: transparent` while maintaining keyboard functionality

## Next Steps/TODO
- Add error handling for data loading
- Implement lazy loading for deep hierarchies
- Add loading states during data fetching
- Consider implementing data persistence
- Add unit tests for components without tests:
  - hierarchy-selector
  - hierarchy-config-modal
  - progress-bar
  - tooltip
  - All services (mock-data, theme, hierarchy-modal)
- Optimize performance for very large datasets (100K+ nodes)
- Configure ESLint/Angular ESLint for code quality
- Add npm scripts for Prettier formatting

## Known Issues
- None currently identified in latest implementation

## Development Notes
1. Always check for undefined values when accessing optional properties
2. Use type guards when working with union types (FILTER|ORG|PER)
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
21. **Color Usage**: NEVER hardcode colors in CSS/SCSS. Always use theme variables. If a new color is needed, declare it in the theme first
22. **Child Search Implementation**: Use signal-based reactive state management for search functionality with proper cleanup of timeouts
23. **Virtual Scrolling Navigation**: Use `viewportRef.scrollToIndex()` for programmatic scrolling to specific nodes in search results
24. **Focus Management**: Use `caret-color: transparent` to hide text cursor on focusable elements while maintaining keyboard functionality
25. **Path Expansion**: Implement recursive path finding to expand parent nodes when navigating to search results
26. **Search Algorithms**: Use recursive traversal for comprehensive child node searching across all descendant levels