import { Link, useNavigate } from "react-router-dom";
import { ADMIN_PAGE_SIZE } from "../../../config/constants";
import { useI18n } from "../../../controllers/I18nController";
import { useAdminList } from "../../../hooks/useAdminList";
import { adminService } from "../../../services/adminService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { ErrorAlert, Loadable, SearchBox, YesNo } from "../../components/admin/AdminKit";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";

export default function AdminUsersPage() {
  const list = useAdminList(adminService.users);
  const navigate = useNavigate();
  const { fmt } = useI18n();

  return (
    <>
      <PageHeader title="Users" description={list.firstLoad ? "Loading…" : `${list.total} accounts`} />
      <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Email or GW2 account" busy={list.loading && !list.firstLoad} />
      <ErrorAlert message={list.error} />
      <Loadable firstLoad={list.firstLoad} loading={list.loading}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>GW2 account</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Blocked</TableHead>
            <TableHead className="text-right">Logs</TableHead>
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">Webhooks</TableHead>
            <TableHead>Last sign-in</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.rows.map((u) => (
            <TableRow key={u.id} className="cursor-pointer" onClick={() => navigate(`/admin/users/${u.id}`)}>
              <TableCell className="font-medium">
                <Link to={`/admin/users/${u.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                  {u.email}
                </Link>
              </TableCell>
              <TableCell>{u.gw2Account || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{fmt.date(u.createdAt)}</TableCell>
              <TableCell>
                <YesNo value={!!u.emailVerifiedAt} yes="Verified" no="No" />
              </TableCell>
              <TableCell>
                <YesNo value={!!u.blockedAt} yes="Blocked" no="—" tone="danger" />
              </TableCell>
              <TableCell className="text-right tabular-nums">{u.logCount}</TableCell>
              <TableCell className="text-right tabular-nums">{u.sessionCount}</TableCell>
              <TableCell className="text-right tabular-nums">{u.webhookCount}</TableCell>
              <TableCell className="text-muted-foreground">{u.lastSeenAt ? fmt.dateTime(u.lastSeenAt) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!list.loading && !list.rows.length && <p className="text-center text-sm text-muted-foreground">No users found.</p>}
      <Pagination page={list.page} pageSize={ADMIN_PAGE_SIZE} total={list.total} onPageChange={list.setPage} />
      </Loadable>
    </>
  );
}
