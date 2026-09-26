import { Card, CardContent } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";

interface Props {
  label: string;
  value: string | number;
  tone?: "success" | "fail";
  mono?: boolean;
}

export default function StatCard({ label, value, tone, mono }: Props) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-5">
        <div
          className={cn(
            "text-2xl font-semibold tracking-tight",
            tone === "success" && "text-success",
            tone === "fail" && "text-destructive",
            mono && "font-mono tabular-nums",
          )}
        >
          {value}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
