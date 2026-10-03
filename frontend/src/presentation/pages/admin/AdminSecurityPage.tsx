import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BanIcon, RefreshCwIcon } from "lucide-react";
import { ADMIN_PAGE_SIZE } from "../../../config/constants";
import { useAdmin } from "../../../controllers/AdminController";
import { useI18n } from "../../../controllers/I18nController";
import type {
  AdminBlockedIp,
  AdminPage,
  AdminRateLimitEvent,
  AdminRateLimitKey,
  AdminRateLimits,
} from "../../../domain/types/admin.types";
import { adminService } from "../../../services/adminService";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import {
  ConfirmButton,
  ErrorAlert,
  Loadable,
  RATE_LIMIT_KIND_LABELS as KIND_LABELS,
  rateLimitKindLabel as kindLabel,
  ShortHash,
  useAdminAction,
} from "../../components/admin/AdminKit";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";

const ALL_KINDS = "__all";

function useSecurityController() {
  const { handleError } = useAdmin();
  const [blocked, setBlocked] = useState<AdminBlockedIp[]>([]);
  const [limits, setLimits] = useState<AdminRateLimits | null>(null);
  const [events, setEvents] = useState<AdminPage<AdminRateLimitEvent>>({ rows: [], total: 0 });
  const [kind, setKind] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAddress, setNewAddress] = useState("");
  const [newNote, setNewNote] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [b, l, e] = await Promise.all([
        adminService.blockedIps(),
        adminService.rateLimits(),
        adminService.rateLimitEvents(kind, page),
      ]);
      setBlocked(b);
      setLimits(l);
      setEvents(e);
      setError(null);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  }, [kind, page, handleError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const action = useAdminAction(reload, setError);
  const blockedSet = new Set(blocked.map((b) => b.ipHash));

  return {
    loading,
    blocked,
    blockedSet,
    limits,
    events,
    kind,
    setKind: (k: string | null) => {
      setKind(k);
      setPage(1);
    },
    page,
    setPage,
    error,
    reload,
    busy: action.busy,
    newAddress,
    setNewAddress,
    newNote,
    setNewNote,
    // An IPv4 or IPv6 address (the server checks it exactly and stores only its hash).
    validNewAddress: /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:.]*:[0-9a-fA-F:.]*)$/.test(newAddress.trim()),
    blockNew: () =>
      action.run("new", async () => {
        await adminService.blockIp(newAddress.trim(), newNote.trim());
        setNewAddress("");
        setNewNote("");
      }),
    block: (ipHash: string, note: string) => action.run(ipHash, () => adminService.blockIp(ipHash, note)),
    unblock: (ipHash: string) => action.run(ipHash, () => adminService.unblockIp(ipHash)),
  };
}

type Controller = ReturnType<typeof useSecurityController>;

/** Who / where a rate-limit key is about, with a button to block its address. */
function KeyTarget({ k, c }: { k: AdminRateLimitKey; c: Controller }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {k.email && k.userId && (
        <Link to={`/admin/users/${k.userId}`} className="hover:underline">
          {k.email}
        </Link>
      )}
      {k.ipHash &&
        (c.blockedSet.has(k.ipHash) ? (
          <span className="text-xs text-destructive">
            <ShortHash value={k.ipHash} /> blocked
          </span>
        ) : (
          <>
            <ShortHash value={k.ipHash} />
            <ConfirmButton
              label="Block"
              icon={<BanIcon />}
              title="Block this address?"
              description="Every request from it is refused, signed in or not."
              confirmLabel="Block"
              busy={c.busy === k.ipHash}
              onConfirm={() => c.block(k.ipHash!, `Rate limit: ${kindLabel(k.kind)}`)}
            />
          </>
        ))}
      {!k.email && !k.ipHash && <span className="font-mono text-xs text-muted-foreground">{k.key}</span>}
    </div>
  );
}

export default function AdminSecurityPage() {
  const c = useSecurityController();
  const { fmt } = useI18n();

  return (
    <>
      <PageHeader
        title="Security"
        description="Blocked addresses and requests refused by rate limits. Addresses are SHA-256 hashes, never the IPs themselves."
        actions={
          <Button variant="outline" size="sm" onClick={c.reload} disabled={c.loading}>
            <RefreshCwIcon className={cn(c.loading && "animate-spin")} /> Refresh
          </Button>
        }
      />
      <ErrorAlert message={c.error} />

      <Loadable firstLoad={c.loading && !c.limits} loading={c.loading}>
        <Card>
          <CardHeader>
            <CardTitle>Blocked addresses</CardTitle>
            <CardDescription>Every API request from these is refused (the admin area stays reachable).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {c.blocked.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address (hash)</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Used by</TableHead>
                    <TableHead>Blocked</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.blocked.map((b) => (
                    <TableRow key={b.ipHash}>
                      <TableCell>
                        <ShortHash value={b.ipHash} />
                      </TableCell>
                      <TableCell>{b.note || "—"}</TableCell>
                      <TableCell className="text-sm">{b.users.length ? b.users.join(", ") : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{fmt.dateTime(b.blockedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={c.busy === b.ipHash}
                          onClick={() => c.unblock(b.ipHash)}
                        >
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No blocked addresses.</p>
            )}
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (c.validNewAddress) c.blockNew();
              }}
            >
              <div className="flex min-w-72 flex-1 flex-col gap-1.5">
                <Label htmlFor="new-hash">IP address</Label>
                <Input
                  id="new-hash"
                  placeholder="195.234.32.12"
                  className="font-mono text-xs"
                  value={c.newAddress}
                  onChange={(e) => c.setNewAddress(e.target.value.trim())}
                />
              </div>
              <div className="flex min-w-48 flex-col gap-1.5">
                <Label htmlFor="new-note">Note</Label>
                <Input id="new-note" value={c.newNote} onChange={(e) => c.setNewNote(e.target.value)} maxLength={300} />
              </div>
              <Button type="submit" variant="outline" disabled={!c.validNewAddress || c.busy === "new"}>
                <BanIcon /> Block
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refused requests by limit</CardTitle>
            <CardDescription>Click a row to see its requests below.</CardDescription>
          </CardHeader>
          <CardContent>
            {c.limits?.byKind.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Limit</TableHead>
                    <TableHead className="text-right">Last 24 h</TableHead>
                    <TableHead className="text-right">Last 7 days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.limits.byKind.map((k) => (
                    <TableRow key={k.kind} className="cursor-pointer" onClick={() => c.setKind(k.kind)}>
                      <TableCell>
                        <button type="button" className="text-left hover:underline" onClick={() => c.setKind(k.kind)}>
                          {kindLabel(k.kind)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{k.last24h}</TableCell>
                      <TableCell className="text-right tabular-nums">{k.last7d}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing refused in the last 7 days.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Refused most (24 h)</CardTitle>
            </CardHeader>
            <CardContent>
              {c.limits?.topKeys.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Limit</TableHead>
                      <TableHead>Who / where</TableHead>
                      <TableHead className="text-right">Refused</TableHead>
                      <TableHead>Last</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.limits.topKeys.map((k) => (
                      <TableRow key={`${k.kind}:${k.key}`}>
                        <TableCell className="text-sm">{kindLabel(k.kind)}</TableCell>
                        <TableCell>
                          <KeyTarget k={k} c={c} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{k.refused}</TableCell>
                        <TableCell className="text-muted-foreground">{fmt.dateTime(k.lastAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing refused in the last 24 hours.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Counters running now</CardTitle>
              <CardDescription>Limits being counted at the moment, fullest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {c.limits?.active.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Limit</TableHead>
                      <TableHead>Who / where</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead>Resets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.limits.active.map((k) => (
                      <TableRow key={`${k.kind}:${k.key}`}>
                        <TableCell className="text-sm">{kindLabel(k.kind)}</TableCell>
                        <TableCell>
                          <KeyTarget k={k} c={c} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{k.count}</TableCell>
                        <TableCell className="text-muted-foreground">{fmt.dateTime(k.expiresAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No counters running.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Refused requests</CardTitle>
            <CardDescription>{c.events.total} in the last 30 days</CardDescription>
            <CardAction>
              <Select value={c.kind ?? ALL_KINDS} onValueChange={(v) => c.setKind(v === ALL_KINDS ? null : v)}>
                <SelectTrigger size="sm" aria-label="Limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                  <SelectItem value={ALL_KINDS}>All limits</SelectItem>
                  {Object.keys(KIND_LABELS).map((k) => (
                    <SelectItem key={k} value={k}>
                      {kindLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {c.events.rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Who / where</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.events.rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-muted-foreground">{fmt.dateTime(e.createdAt)}</TableCell>
                      <TableCell className="text-sm">{kindLabel(e.kind)}</TableCell>
                      <TableCell>
                        <KeyTarget k={e} c={c} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No refused requests.</p>
            )}
            <Pagination page={c.page} pageSize={ADMIN_PAGE_SIZE} total={c.events.total} onPageChange={c.setPage} />
          </CardContent>
        </Card>
      </Loadable>
    </>
  );
}
