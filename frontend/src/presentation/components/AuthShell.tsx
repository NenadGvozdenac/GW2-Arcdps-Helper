import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import Brand from "./Brand";
import LanguageSwitcher from "./LanguageSwitcher";

interface Props {
  title: string;
  description?: string;
  onSubmit: () => void;
  children: ReactNode;
  footer: ReactNode;
}

/** Centered card used by the sign-in and registration pages. */
export default function AuthShell({ title, description, onSubmit, children, footer }: Props) {
  return (
    <div className="grid min-h-svh place-items-center bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)] p-4">
      <Card className="w-full max-w-sm">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between">
              <Brand />
              <LanguageSwitcher />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-xl">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
          <CardFooter className="flex flex-col gap-3">{footer}</CardFooter>
        </form>
      </Card>
    </div>
  );
}
