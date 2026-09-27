import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";

interface Props {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Lets the user pick how many items a page shows. */
  pageSizes?: { options: number[]; onChange: (size: number) => void };
}

/** Page numbers to show: always the first and last, the current one with a neighbour on each side, gaps as null. */
function pageList(page: number, pages: number): (number | null)[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const [i, p] of sorted.entries()) {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  }
  return out;
}

/**
 * "1–20 of 57" plus previous / page numbers / next, and optionally a page-size picker. Renders nothing when everything
 * fits on one page and there is no smaller page size to pick.
 */
export default function Pagination({ page, pageSize, total, onPageChange, pageSizes }: Props) {
  const { t } = useI18n();
  const pages = Math.ceil(total / pageSize);
  const canResize = !!pageSizes && total > Math.min(...pageSizes.options);
  if (pages <= 1 && !canResize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={t("pagination.label")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">{t("pagination.range", { from, to, total })}</span>
        {canResize && (
          <Select value={String(pageSize)} onValueChange={(v) => pageSizes.onChange(Number(v))}>
            <SelectTrigger size="sm" className="w-auto" aria-label={t("pagination.pageSize")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.options.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {t("pagination.perPage", { count: size })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t("pagination.previous")}
          >
            <ChevronLeftIcon />
          </Button>
          {pageList(page, pages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "secondary" : "ghost"}
                size="sm"
                className="h-8 min-w-8 px-2 tabular-nums"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label={t("pagination.next")}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </nav>
  );
}
