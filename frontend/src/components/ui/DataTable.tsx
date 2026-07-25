import { type ReactNode, useMemo, useState, useCallback } from "react";
import { cn } from "@/utils/cn";
import { ChevronUp, ChevronDown, ChevronUpDown, Search, Filter, Download, MoreHorizontal } from "lucide-react";

import { Button } from "./Button";
import { Input } from "./Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Badge } from "./Badge";
import { Pagination } from "./Pagination";
import { Table, THead, TBody, TR, TH, TD } from "./Table";

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => ReactNode;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: Array<{ value: string; label: string }>;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyAccessor: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  pageSizes?: number[];
  exportable?: boolean;
  onExport?: (data: T[]) => void;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyAccessor,
  searchable = true,
  searchPlaceholder = "Search...",
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizes = [10, 25, 50, 100],
  exportable = false,
  onExport,
  rowClassName,
  emptyMessage = "No data available",
  loading = false,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filteredData = useMemo(() => {
    let result = data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((row) => String((row as Record<string, unknown>)[key]) === value);
      }
    });

    if (sortConfig && sortable) {
      const { key, direction } = sortConfig;
      const column = columns.find((c) => c.key === key);
      if (column) {
        result = [...result].sort((a, b) => {
          const aVal = column.accessor ? column.accessor(a) : (a as Record<string, unknown>)[key];
          const bVal = column.accessor ? column.accessor(b) : (b as Record<string, unknown>)[key];
          const comparison = String(aVal).localeCompare(String(bVal));
          return direction === "asc" ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, searchQuery, filters, sortConfig, columns, sortable]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pagination, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = useCallback((key: string) => {
    if (!sortable) return;
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, [sortable]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleExport = useCallback(() => {
    if (onExport) onExport(filteredData);
  }, [filteredData, onExport]);

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-navy-100 bg-white shadow-soft overflow-hidden", className)}>
        <div className="p-4 border-b border-navy-100 bg-navy-50">
          <div className="flex gap-4">
            {columns.slice(0, 4).map((_, i) => (
              <div key={i} className="h-4 w-24 animate-pulse rounded bg-navy-100" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-navy-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex gap-4">
                {columns.slice(0, 4).map((_, j) => (
                  <div key={j} className="h-4 w-32 animate-pulse rounded bg-navy-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-navy-100 bg-white shadow-soft overflow-hidden", className)}>
      <div className="p-4 border-b border-navy-100 bg-navy-50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {searchable && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-64"
                aria-label="Search table"
              />
            </div>
          )}

          {filterable && (
            <div className="flex gap-2">
              {columns
                .filter((c) => c.filterable && c.filterOptions)
                .map((col) => (
                  <Select key={col.key} value={filters[col.key] || ""} onValueChange={(v) => handleFilterChange(col.key, v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={`Filter ${col.header}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {col.filterOptions!.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
            </div>
          )}

          {exportable && (
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={filteredData.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>

        {pagination && filteredData.length > pageSize && (
          <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <THead>
            <TR>
              {columns.map((column) => (
                <TH
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {sortable && column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="p-1 text-navy-400 hover:text-navy-600 transition-colors"
                        aria-label={`Sort by ${column.header}`}
                      >
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUpDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {paginatedData.length === 0 ? (
              <TR>
                <TD colSpan={columns.length} className="py-12 text-center text-navy-500">
                  {emptyMessage}
                </TD>
              </TR>
            ) : (
              paginatedData.map((row) => (
                <TR
                  key={keyAccessor(row)}
                  className={cn(rowClassName?.(row))}
                >
                  {columns.map((column) => (
                    <TD
                      key={column.key}
                      className={cn(
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.className
                      )}
                    >
                      {column.cell ? column.cell(row) : column.accessor ? column.accessor(row) : (row as Record<string, unknown>)[column.key]}
                    </TD>
                  ))}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>

      {pagination && filteredData.length > pageSize && (
        <Pagination
          meta={{
            page: currentPage,
            total_pages: totalPages,
            total: filteredData.length,
            per_page: pageSize,
          }}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}