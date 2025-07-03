# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UCM is a financial data dashboard built with Angular 20 and TypeScript. The application displays hierarchical financial data with advanced filtering, searching, and performance optimizations for handling 100K+ rows.

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
- **Styling**: SCSS
- **Testing**: Karma + Jasmine
- **Build**: Angular CLI with esbuild

### Key Architectural Decisions
1. **Standalone Components**: No NgModules, using modern Angular approach
2. **Strict TypeScript**: Full strict mode enabled for type safety
3. **Component Structure**: Components should be self-contained with .ts, .html, .scss, and .spec.ts files

### Project Structure Pattern
```
src/app/
├── components/          # Reusable UI components
├── services/           # Business logic and data services
├── models/             # TypeScript interfaces/types
├── shared/             # Shared utilities and helpers
└── features/           # Feature-specific modules
```

## Key Implementation Requirements (from PRD)

### Core Features to Implement
1. **Hierarchical Data Grid**
   - Virtual scrolling for 100K+ rows
   - Expand/collapse functionality
   - Inline editing with validation
   - Column sorting and resizing

2. **Performance Requirements**
   - Initial load < 3 seconds
   - Smooth scrolling (60 fps)
   - Search results < 500ms
   - Use virtual scrolling and lazy loading

3. **UI Components Needed**
   - Header with theme toggle and user menu
   - Search bar with advanced filtering
   - Hierarchical data grid
   - Context menus for row actions
   - Loading states and error handling

4. **Data Service**
   - Mock service generating 10,000 hierarchical records
   - Support for CRUD operations
   - Filtering and search functionality
   - Hierarchy manipulation methods

## Testing Approach

Run specific tests:
```bash
ng test --include='**/specific.spec.ts'    # Run specific test file
ng test --watch=false                      # Run tests once without watching
ng test --code-coverage                    # Generate coverage report
```

## Important Configuration

### TypeScript (tsconfig.json)
- Strict mode is enabled - all type checking features are on
- Target: ES2022
- Use path aliases for clean imports when needed

### Angular Build
- Production budgets: 500KB initial, 1MB total
- SCSS preprocessing enabled
- Source maps enabled for development

### Code Style
- 2-space indentation (enforced by .editorconfig)
- Single quotes in TypeScript
- UTF-8 encoding
- Trim trailing whitespace

## Development Notes

1. Always use Angular CLI for generating components/services: `ng generate component <name>`
2. Follow Angular style guide for naming conventions
3. Implement lazy loading for better performance with large datasets
4. Use OnPush change detection strategy for grid components
5. Implement proper error boundaries and loading states
6. Consider using Angular CDK Virtual Scrolling for the data grid