import type { ReactNode } from "react";

interface Props {
  /** Text, or a placeholder (e.g. a Skeleton) while it isn't known yet. */
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {typeof title === "string" ? <h1 className="text-2xl font-semibold tracking-tight">{title}</h1> : title}
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions}
    </div>
  );
}
