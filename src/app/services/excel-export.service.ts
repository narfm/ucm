import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { HierarchyNode, ColumnDefinition } from '../models/financial-data.interface';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  exportToExcel(data: HierarchyNode[], columns: ColumnDefinition[], filename: string = 'hierarchy-data'): void {
    // Flatten the hierarchical data for export
    const flattenedData = this.flattenHierarchicalData(data);
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = this.createWorksheet(flattenedData, columns);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hierarchy Data');
    
    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.downloadFile(excelBuffer, `${filename}.xlsx`);
  }

  private flattenHierarchicalData(nodes: HierarchyNode[], level: number = 0, expandedNodeIds: Set<string> = new Set(), result: any[] = []): any[] {
    nodes.forEach(node => {
      // Create flattened row with level information
      const flatRow = {
        ...node,
        level: level,
        indentedName: this.createIndentedName(node.name, level)
      };
      
      result.push(flatRow);
      
      // Add children if they exist
      if (node.children && node.children.length > 0) {
        this.flattenHierarchicalData(node.children, level + 1, expandedNodeIds, result);
      }
    });
    
    return result;
  }

  private createIndentedName(name: string, level: number): string {
    const indent = '  '.repeat(level); // Two spaces per level
    return `${indent}${name}`;
  }

  private createWorksheet(data: any[], columns: ColumnDefinition[]): XLSX.WorkSheet {
    // Create headers
    const headers = columns.map(col => col.label);
    
    // Create data rows
    const rows = data.map(row => {
      return columns.map(col => {
        if (col.key === 'name') {
          // Use indented name for hierarchy display
          return row.indentedName || row.name;
        }
        
        const value = this.getCellValue(row, col);
        return this.formatCellValue(value, col);
      });
    });
    
    // Combine headers and data
    const worksheetData = [headers, ...rows];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Apply formatting
    this.applyWorksheetFormatting(worksheet, data, columns);
    
    return worksheet;
  }

  private getCellValue(row: any, column: ColumnDefinition): any {
    return row[column.key];
  }

  private formatCellValue(value: any, column: ColumnDefinition): string {
    if (value == null) return '';
    
    switch (column.dataType) {
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        const stringValue = String(value);
        // Hide type column value for FILTER rows
        if (column.key === 'type' && (stringValue === 'FILTER' || stringValue.startsWith('FILTER/'))) {
          return '';
        }
        return stringValue;
    }
  }

  private applyWorksheetFormatting(worksheet: XLSX.WorkSheet, data: any[], columns: ColumnDefinition[]): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Set column widths
    const columnWidths = columns.map((col, index) => {
      if (col.key === 'name') {
        // Calculate max width based on indentation levels
        const maxIndentedLength = Math.max(
          ...data.map(row => (row.indentedName || row.name || '').length),
          col.label.length
        );
        return { wch: Math.min(maxIndentedLength + 5, 50) }; // Cap at 50 characters
      }
      return { wch: Math.max(col.label.length + 5, 15) }; // Minimum 15 characters
    });
    
    worksheet['!cols'] = columnWidths;
    
    // Format header row
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "366092" } },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }
    
    // Format data rows
    for (let row = 1; row <= range.e.r; row++) {
      const dataIndex = row - 1;
      const rowData = data[dataIndex];
      
      if (!rowData) continue;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          const style: any = {
            border: {
              top: { style: "thin", color: { rgb: "E0E0E0" } },
              bottom: { style: "thin", color: { rgb: "E0E0E0" } },
              left: { style: "thin", color: { rgb: "E0E0E0" } },
              right: { style: "thin", color: { rgb: "E0E0E0" } }
            },
            alignment: { vertical: "center" }
          };
          
          // Apply different styling based on node type
          if (rowData.type === 'FILTER' || (rowData.type && rowData.type.startsWith('FILTER/'))) {
            // Filter rows - accent background
            style.fill = { fgColor: { rgb: "E8F4FD" } };
            style.font = { bold: true, color: { rgb: "1976D2" } };
          } else if (rowData.type === 'ORG') {
            // Organization rows - light green background
            style.fill = { fgColor: { rgb: "E8F5E8" } };
            style.font = { color: { rgb: "2E7D32" } };
          } else if (rowData.type === 'PER') {
            // Person rows - light purple background
            style.fill = { fgColor: { rgb: "F3E5F5" } };
            style.font = { color: { rgb: "7B1FA2" }, italic: true };
          }
          
          // Add indentation styling for name column
          if (col === 0 && columns[0].key === 'name') { // Assuming first column is name
            const level = rowData.level || 0;
            style.alignment = { ...style.alignment, indent: level };
          }
          
          worksheet[cellAddress].s = style;
        }
      }
    }
    
    // Freeze header row
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  }

  private downloadFile(buffer: any, filename: string): void {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}