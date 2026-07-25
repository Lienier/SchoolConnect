/** Pagination control bound to a PaginationMeta payload. */
import { type PaginationMeta } from "@/types/api";

import { Button } from "./Button";

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, total_pages } = meta;
  if (total_pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-navy-600">
      <span>
        Page {page} of {total_pages}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
