import { cn } from "@/presentation/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent skeleton-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
