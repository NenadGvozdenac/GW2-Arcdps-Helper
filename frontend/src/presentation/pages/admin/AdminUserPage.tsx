import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, BanIcon, LogOutIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { useAdmin } from "../../../controllers/AdminController";
import { useI18n } from "../../../controllers/I18nController";
import type { AdminUserDetail } from "../../../domain/types/admin.types";
import { adminService } from "../../../services/adminService";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { ConfirmButton, ErrorAlert, ShortHash, useAdminAction } from "../../components/admin/AdminKit";
import WebhookTable from "../../components/admin/WebhookTable";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";

function useUserController(id: string) {
  const { handleError } = useAdmin();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const reload = useCallback(async () => {
    try {
      setUser(await adminService.user(id));
      setError(null);
    } catch (err) {
      setError(handleError(err));
    }
  }, [id, handleError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const action = useAdminAction(reload, setError);
  const deleteAction = useAdminAction(() => navigate("/admin/users"), setError);

  return {
    user,
    error,
    reason,
    setReason,
    busy: action.busy ?? deleteAction.busy,
    reload,
    setError,
    block: () => action.run("block", () => adminService.blockUser(id, reason)),
    unblock: () => action.run("unblock", () => adminService.unblockUser(id)),
    signOut: () => action.run("signOut", () => adminService.signOutUser(id)),
    remove: () => deleteAction.run("delete", () => adminService.deleteUser(id)),
    blockIp: (ipHash: string) => action.run(ipHash, () => adminService.blockIp(ipHash, `Used by ${user?.email ?? id}`)),
    unblockIp: (ipHash: string) => action.run(ipHash, () => adminService.unblockIp(ipHash)),
  };
}

export default function AdminUserPage() {
  const { id = "" } = useParams();
  const c = useUserController(id);
  const { fmt } = useI18n();
  const u = c.user;

  const back = (
    <Button asChild variant="ghost" size="sm" className="self-start">
      <Link to="/admin/users">
        <ArrowLeftIcon /> All users
      </Link>
    </Button>
  );
  if (!u) return (
    <>
      {back}
      <ErrorAlert message={c.error} />
    </>
  );

  return (
    <>
      {back}
      <PageHeader
        title={u.email}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <span>{u.gw2Account || "No GW2 account"}</span>
            <span>· registered {fmt.date(u.createdAt)}</span>
            {u.emailVerifiedAt ? <Badge variant="outline">Verified</Badge> : <Badge variant="outline">Not verified</Badge>}
            {u.blockedAt && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Blocked {fmt.dateTime(u.blockedAt)}
                {u.blockedReason ? ` — ${u.blockedReason}` : ""}
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {u.blockedAt ? (
              <ConfirmButton
                label="Unblock"
                icon={<ShieldCheckIcon />}
                title="Unblock this account?"
                description="They can sign in again. Their earlier sign-ins stay signed out."
                confirmLabel="Unblock"
                destructive={false}
                busy={c.busy === "unblock"}
                onConfirm={c.unblock}
              />
            ) : (
              <ConfirmButton
                label="Block"
                icon={<BanIcon />}
                title="Block this account?"
                description="Signing in is refused and every sign-in (website, uploader, addon) stops working at once."
                confirmLabel="Block"
                busy={c.busy === "block"}
                onConfirm={c.block}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="block-reason">Reason (only you see it)</Label>
                  <Input id="block-reason" value={c.reason} onChange={(e) => c.setReason(e.target.value)} maxLength={300} />
                </div>
              </ConfirmButton>
            )}
            <ConfirmButton
              label="Sign out everywhere"
              icon={<LogOutIcon />}
              title="Sign this user out everywhere?"
              description="The website, the desktop uploader and the Nexus addon all have to sign in again."
              confirmLabel="Sign out"
              destructive={false}
              busy={c.busy === "signOut"}
              onConfirm={c.signOut}
            />
            <ConfirmButton
              label="Delete account"
              icon={<Trash2Icon />}
              title="Delete this account?"
              description={`${u.email} is deleted with all ${u.logCount} logs, ${u.sessionCount} sessions and their webhooks. This can't be undone.`}
              busy={c.busy === "delete"}
              onConfirm={c.remove}
            />
          </div>
        }
      />
      <ErrorAlert message={c.error} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link to={`/admin/logs?userId=${u.id}`} className="rounded-xl">
          <StatCard label="Logs →" value={u.logCount} />
        </Link>
        <Link to={`/admin/sessions?userId=${u.id}`} className="rounded-xl">
          <StatCard label="Sessions →" value={u.sessionCount} />
        </Link>
        <StatCard label="Webhooks" value={u.webhookCount} />
        <StatCard label="Last sign-in" value={u.lastSeenAt ? fmt.dateTime(u.lastSeenAt) : "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign-in addresses</CardTitle>
          <CardDescription>
            Hashes of the IP addresses this account signed in from (the last 90 days). Blocking one refuses every request
            from it, for every account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {u.ips.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address (hash)</TableHead>
                  <TableHead>First seen</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {u.ips.map((ip) => (
                  <TableRow key={ip.ipHash}>
                    <TableCell>
                      <ShortHash value={ip.ipHash} />
                      {ip.blocked && (
                        <Badge variant="outline" className="ml-2 border-destructive/40 text-destructive">
                          Blocked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmt.dateTime(ip.firstSeenAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt.dateTime(ip.lastSeenAt)}</TableCell>
                    <TableCell className="text-right">
                      {ip.blocked ? (
                        <Button variant="outline" size="sm" disabled={c.busy === ip.ipHash} onClick={() => c.unblockIp(ip.ipHash)}>
                          Unblock address
                        </Button>
                      ) : (
                        <ConfirmButton
                          label="Block address"
                          icon={<BanIcon />}
                          title="Block this address?"
                          description="Every request from it is refused - also other accounts using the same network."
                          confirmLabel="Block"
                          busy={c.busy === ip.ipHash}
                          onConfirm={() => c.blockIp(ip.ipHash)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No sign-ins recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <WebhookTable rows={u.webhooks} showOwner={false} onChanged={c.reload} onError={c.setError} />
        </CardContent>
      </Card>
    </>
  );
}
