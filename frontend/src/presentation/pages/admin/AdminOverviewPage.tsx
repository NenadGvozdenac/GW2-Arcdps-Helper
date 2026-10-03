import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../../controllers/AdminController";
import type { AdminOverview } from "../../../domain/types/admin.types";
import { adminService } from "../../../services/adminService";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { ErrorAlert } from "../../components/admin/AdminKit";
import PageHeader from "../../components/PageHeader";

function useOverviewController() {
  const { handleError } = useAdmin();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminService.overview().then(setOverview, (err) => setError(handleError(err)));
  }, [handleError]);
  return { overview, error };
}

function Tile({ to, value, label, detail }: { to: string; value: number; label: string; detail?: string }) {
  return (
    <Link to={to} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Card className="h-full gap-1 py-4 transition-colors hover:border-foreground/30">
        <CardContent className="px-5">
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-sm font-medium">{label}</div>
          {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const c = useOverviewController();
  const o = c.overview;

  return (
    <>
      <PageHeader title="Overview" description="Everything on GW2 ArcDPS Helper, across all accounts." />
      <ErrorAlert message={c.error} />
      {o && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          <Tile to="/admin/users" value={o.users} label="Users" detail={`${o.verifiedUsers} verified · ${o.blockedUsers} blocked`} />
          <Tile to="/admin/logs" value={o.logs} label="Logs" detail={`${o.logsLast24h} in the last 24 h`} />
          <Tile to="/admin/sessions" value={o.sessions} label="Sessions" detail={`${o.activeSessions} active`} />
          <Tile to="/admin/webhooks" value={o.webhooks} label="Discord webhooks" />
          <Tile to="/admin/security" value={o.blockedIps} label="Blocked addresses" />
          <Tile to="/admin/security" value={o.rateLimitEventsLast24h} label="Refused requests" detail="rate limits, last 24 h" />
        </div>
      )}
    </>
  );
}
