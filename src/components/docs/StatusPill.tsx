import { cn } from "@/lib/utils";
import { DOC_STATUSES, type DocStatus } from "@/lib/docsStatus";

const StatusPill = ({ status }: { status: DocStatus }) => {
  const s = DOC_STATUSES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 align-[0.08em] text-[11px] font-semibold leading-4 ring-1 ring-inset",
        s.pill,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.mark)} aria-hidden />
      {s.label}
    </span>
  );
};

export default StatusPill;
