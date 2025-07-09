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
│   └── progress-bar/   # Reusable loading progress bar
├── services/           
│   ├── mock-data.service.ts  # Generates hierarchical data (returns Observable)
│   └── theme.service.ts      # Theme management
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
- Visual differentiation: filter rows have subtle background coloring
- Iconography: type icons (filter/org/person) and legal entity status (checkmark/X)
- Loading states during hierarchy configuration changes

### Filter Bar Component
- Search by name or party ID
- Max depth selector (1-5 levels)
- Clear all functionality
- Compact hierarchy selector in header with click-to-expand configuration

### Hierarchy Selector Component
- Dual-mode display: compact in header, full modal on click
- Drag-and-drop reordering with Angular CDK
- Active/inactive hierarchy configuration
- Modal overlay pattern with Apply/Cancel workflow
- Pending configuration state - changes applied only on Apply button click
- Preview functionality shows configuration before applying
- Loading indicator during data reload after configuration changes

### Mock Data Service
- Returns Observable<HierarchyResponse> for async data loading
- Generates hierarchical data based on request parameters
- Creates organizations and persons under filter types
- Supports search and filtering
- Maintains parent-child relationships
- Simulates network delay (1.5s) for realistic loading experience

### Progress Bar Component
- Reusable loading component
- Configurable message and show/hide state
- Used during async data operations

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
1. **Async Data Loading**: Converted MockDataService to return Observable with simulated delay
2. **Progress Bar**: Added reusable ProgressBarComponent for loading states
3. **Hierarchy Configuration**: Created HierarchySelectorComponent with dual-mode display (compact header + full modal)
4. **Apply/Cancel Workflow**: Implemented pending configuration state with Apply/Cancel buttons
5. **Data Grid Reload**: Added self-managed data loading with loading indicators during configuration changes
6. **Visual Improvements**: Added row color coding and iconography for different node types
7. **Subtle Styling**: Filter rows now have subtle background color (2% opacity blue)
8. **Bug Fixes**: Fixed column resize triggering sort by adding timing controls
9. **TypeScript Cleanup**: Removed unnecessary optional chaining operators
10. **Component Architecture**: Improved separation of concerns with dedicated components

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