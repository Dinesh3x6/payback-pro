"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, Plus, MoreVertical, Phone, Mail, MessageCircle, AlertTriangle, 
  CheckCircle2, Clock, Trash2, Edit, ChevronLeft, ChevronRight, Download, Filter, FileText, Activity, Bell, Users
} from "lucide-react";
import { apiGet, apiPost, apiDelete, apiPut } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Modal } from "@/components/modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

// --- Types ---
interface Repayment { id: string; amount: string; paidAt: string; }
interface Loan { id: string; principal: string; interestRate: string; status: string; dueDate: string | null; repayments: Repayment[]; }
interface Payment { id: string; amount: string; status: string; }
interface RawBorrower { id: string; name: string; phone?: string; email?: string; notes?: string; tags?: string[]; createdAt?: string; loans: Loan[]; payments?: Payment[]; }

interface CRMBorrower extends RawBorrower {
  totalLoan: number;
  totalPaid: number;
  remaining: number;
  recoveryPercent: number;
  status: "Settled" | "Active" | "Due Soon" | "Overdue" | "Inactive";
  riskLevel: "Low" | "Medium" | "High";
  nextDueDate: string | null;
  lastPaymentDate: string | null;
  activeLoanCount: number;
}

// --- Data Processor ---
function processBorrowerData(raw: RawBorrower[]): CRMBorrower[] {
  const now = new Date();
  
  return raw.map(b => {
    let totalLoan = 0;
    let totalPaid = 0;
    let activeLoanCount = 0;
    let nextDueDate: string | null = null;
    let lastPaymentDate: string | null = null;
    let isOverdue = false;
    let isDueSoon = false;
    let maxOverdueDays = 0;

    for (const l of b.loans) {
      const principal = Number(l.principal);
      const interest = principal * (Number(l.interestRate ?? 0) / 100);
      const owed = principal + interest;
      totalLoan += owed;

      let paid = 0;
      for (const r of l.repayments || []) {
        const amt = Number(r.amount);
        paid += amt;
        if (!lastPaymentDate || new Date(r.paidAt) > new Date(lastPaymentDate)) {
          lastPaymentDate = r.paidAt;
        }
      }
      totalPaid += paid;
      const remaining = owed - paid;

      if (remaining > 0) activeLoanCount++;

      if (l.dueDate && remaining > 0) {
        const dDate = new Date(l.dueDate);
        const daysDiff = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        
        if (daysDiff < 0) {
          isOverdue = true;
          maxOverdueDays = Math.max(maxOverdueDays, Math.abs(daysDiff));
        } else if (daysDiff <= 3) {
          isDueSoon = true;
        }

        if (!nextDueDate || dDate < new Date(nextDueDate)) {
          nextDueDate = l.dueDate;
        }
      }
    }

    const remaining = Math.max(totalLoan - totalPaid, 0);
    const recoveryPercent = totalLoan > 0 ? (totalPaid / totalLoan) * 100 : 0;

    // Determine Status
    let status: CRMBorrower["status"] = "Inactive";
    if (b.loans.length === 0) status = "Inactive";
    else if (remaining <= 0) status = "Settled";
    else if (isOverdue) status = "Overdue";
    else if (isDueSoon) status = "Due Soon";
    else status = "Active";

    // Determine Risk
    let riskLevel: CRMBorrower["riskLevel"] = "Low";
    if (status === "Overdue" && maxOverdueDays > 15) riskLevel = "High";
    else if (status === "Overdue") riskLevel = "Medium";
    else if (recoveryPercent < 10 && totalLoan > 0 && activeLoanCount > 1) riskLevel = "Medium";
    if (status === "Settled") riskLevel = "Low";

    return {
      ...b,
      totalLoan,
      totalPaid,
      remaining,
      recoveryPercent,
      status,
      riskLevel,
      nextDueDate,
      lastPaymentDate,
      activeLoanCount
    };
  });
}

// --- Main Page Component ---
export default function CRMPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CRMBorrower[]>([]);
  
  // Table State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortConfig, setSortConfig] = useState<{ key: keyof CRMBorrower, direction: "asc" | "desc" }>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete/Archive modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBorrowers, setDeletingBorrowers] = useState<CRMBorrower[]>([]);
  const [deletingSubmitting, setDeletingSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await apiGet<RawBorrower[]>("/borrowers");
      setData(processBorrowerData(res));
    } catch {
      toast.error("Failed to load borrowers");
    } finally {
      setLoading(false);
    }
  }

  // --- Filtering & Sorting ---
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b => 
        b.name.toLowerCase().includes(q) || 
        b.phone?.toLowerCase().includes(q) || 
        b.email?.toLowerCase().includes(q) ||
        b.notes?.toLowerCase().includes(q) ||
        b.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Status Filter
    if (statusFilter !== "All") {
      result = result.filter(b => b.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, search, statusFilter, sortConfig]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const paginatedData = filteredAndSortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const requestSort = (key: keyof CRMBorrower) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  // --- Handlers ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(paginatedData.map(b => b.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const deleteStats = useMemo(() => {
    let outstanding = 0;
    let loansCount = 0;
    let paymentsCount = 0;
    let hasActiveLoans = false;
    let names: string[] = [];

    deletingBorrowers.forEach(b => {
      names.push(b.name);
      outstanding += b.remaining;
      loansCount += b.loans.length;
      paymentsCount += b.payments?.length ?? 0;
      if (b.loans.some(l => l.status !== "PAID")) {
        hasActiveLoans = true;
      }
    });

    return {
      outstanding,
      loansCount,
      paymentsCount,
      hasActiveLoans,
      names: names.join(", ")
    };
  }, [deletingBorrowers]);

  const handleOpenDeleteDialog = () => {
    if (selectedIds.size === 0) {
      toast.error("No borrower selected.");
      return;
    }
    const targets = data.filter(b => selectedIds.has(b.id));
    setDeletingBorrowers(targets);
    setShowDeleteModal(true);
  };

  const executeDeleteOrArchive = async (mode: "archive" | "permanent") => {
    setDeletingSubmitting(true);
    let succeeded = 0;
    let failed = 0;
    let firstErrorMsg = "";

    for (const b of deletingBorrowers) {
      try {
        await apiDelete<{ action: string; message: string }>(`/borrowers/${b.id}?mode=${mode}`);
        succeeded++;
      } catch (err: any) {
        failed++;
        const msg = err?.response?.data?.message || err?.message || "Unknown error";
        if (!firstErrorMsg) firstErrorMsg = msg;
      }
    }

    setDeletingSubmitting(false);
    setShowDeleteModal(false);
    setDeletingBorrowers([]);
    setSelectedIds(new Set());
    load();

    if (failed === 0) {
      if (mode === "archive") {
        toast.success("Borrower archived successfully.");
      } else {
        toast.success("Borrower deleted successfully.");
      }
    } else if (succeeded > 0) {
      toast.error(`Partially succeeded: ${succeeded} done, ${failed} failed. Reason: ${firstErrorMsg}`);
    } else {
      toast.error(firstErrorMsg);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingBorrowers([]);
    toast.error("Delete operation cancelled.");
  };

  const handleBulkRemind = async () => {
    toast("Bulk Remind is currently sending...", { icon: '🔔' });
    try {
      // Send a quick default email to selected
      const promises = Array.from(selectedIds).map(id => apiPost('/reminders/send-now', {
        borrowerId: id,
        channels: ["EMAIL"],
        message: "Friendly reminder about your outstanding balance."
      }));
      await Promise.allSettled(promises);
      toast.success(`Sent reminders to ${selectedIds.size} borrowers`);
      setSelectedIds(new Set());
      load();
    } catch {
      toast.error("Error sending bulk reminders");
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = "Name,Phone,Email,Total Loan,Total Paid,Remaining,Recovery %,Status,Risk Level\n";
    const csv = data.map(b => 
      `"${b.name}","${b.phone||''}","${b.email||''}",${b.totalLoan},${b.totalPaid},${b.remaining},${b.recoveryPercent.toFixed(1)},"${b.status}","${b.riskLevel}"`
    ).join("\n");
    const blob = new Blob([headers + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `payback_borrowers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddBorrower = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost("/borrowers", { 
        name: addName, 
        phone: addPhone || undefined, 
        email: addEmail || undefined,
        notes: addNotes || undefined 
      });
      setShowAddForm(false);
      setAddName(""); setAddPhone(""); setAddEmail(""); setAddNotes("");
      toast.success("Borrower added");
      load();
    } catch {
      toast.error("Could not add borrower");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Helpers ---
  const getStatusBadge = (status: CRMBorrower["status"]) => {
    const map = {
      "Settled": "bg-moss-light text-moss",
      "Active": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "Due Soon": "bg-amber-light text-amber",
      "Overdue": "bg-rust-light text-rust",
      "Inactive": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    };
    return <span className={`badge text-[10px] ${map[status]}`}>{status}</span>;
  };

  const getRiskBadge = (risk: CRMBorrower["riskLevel"]) => {
    const map = {
      "Low": "bg-moss-light/50 text-moss",
      "Medium": "bg-amber-light/50 text-amber",
      "High": "bg-rust-light/50 text-rust"
    };
    return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-sm ${map[risk]}`}>{risk} Risk</span>;
  };

  return (
    <div>
      <Navbar title="CRM / Borrowers" />
      
      {/* Top Toolbar */}
      <div className="sticky top-0 z-30 bg-paper/95 dark:bg-ink-dark/95 backdrop-blur-md border-b border-line dark:border-ink-light py-4 px-5">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-4 justify-between items-center">
          
          <div className="flex w-full lg:w-auto items-center gap-3">
            <div className="relative flex-1 lg:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input 
                placeholder="Search CRM..." 
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-9 h-9 text-sm w-full"
              />
            </div>
            <select 
              value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field h-9 text-sm bg-transparent !w-32 lg:!w-40"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Due Soon">Due Soon</option>
              <option value="Overdue">Overdue</option>
              <option value="Settled">Settled</option>
            </select>
          </div>

          <div className="flex w-full lg:w-auto items-center gap-2 overflow-x-auto scrollbar-hide">
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2 bg-amber-light/30 px-3 py-1.5 rounded-card border border-amber/20 animate-in fade-in mr-2">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-400 mr-2">{selectedIds.size} selected</span>
                <button onClick={handleBulkRemind} className="btn-secondary text-xs !py-1 !px-2"><Bell size={12} className="mr-1 inline"/> Remind</button>
                <button onClick={handleOpenDeleteDialog} className="btn-secondary text-xs !py-1 !px-2 text-rust hover:bg-rust-light border-rust/20"><Trash2 size={12} className="mr-1 inline"/> Delete</button>
              </div>
            ) : null}
            <button onClick={handleExportCSV} className="btn-secondary text-xs whitespace-nowrap h-9"><Download size={14} className="mr-1.5 inline"/> Export CSV</button>
            <button onClick={() => window.print()} className="btn-secondary text-xs whitespace-nowrap h-9"><FileText size={14} className="mr-1.5 inline"/> Print PDF</button>
            <button onClick={() => setShowAddForm(true)} className="btn-primary text-xs whitespace-nowrap h-9"><Plus size={14} className="mr-1.5 inline"/> Add Borrower</button>
          </div>

        </div>
      </div>

      <main className="px-5 py-6 max-w-[1400px] mx-auto">
        
        {/* Table Container */}
        <div className="stub-card overflow-hidden">
          {loading ? (
             <div className="p-20 text-center text-ink-muted flex flex-col items-center">
               <Activity className="animate-spin mb-3" />
               Loading CRM data...
             </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-paper-muted dark:bg-ink rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-ink-muted" />
              </div>
              <h3 className="text-lg font-medium mb-1">No Borrowers Found</h3>
              <p className="text-sm text-ink-muted">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-paper-muted/50 dark:bg-ink/50 text-xs text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium w-10 text-center">
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === paginatedData.length && paginatedData.length > 0} className="accent-ink cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink transition" onClick={() => requestSort("name")}>Borrower Profile</th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink transition" onClick={() => requestSort("remaining")}>Financial Progress</th>
                    <th className="px-4 py-3 font-medium">Status & Risk</th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink transition" onClick={() => requestSort("nextDueDate")}>Key Dates</th>
                    <th className="px-4 py-3 font-medium text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(b => (
                    <tr key={b.id} className="border-b border-line/50 dark:border-ink-light/50 last:border-0 hover:bg-paper-muted/30 transition group">
                      
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => handleSelectOne(b.id)} className="accent-ink cursor-pointer" />
                      </td>

                      {/* Profile */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-ink/10 dark:bg-paper/10 text-ink dark:text-paper flex items-center justify-center font-display font-semibold shrink-0">
                            {b.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/borrowers/${b.id}`} className="font-semibold text-[13px] hover:underline flex items-center gap-1.5">
                              {b.name} 
                              {b.activeLoanCount > 1 && <span className="badge bg-line dark:bg-ink text-[9px] px-1 py-0 border-0">{b.activeLoanCount} loans</span>}
                            </Link>
                            <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-2">
                              {b.phone && <span><Phone size={10} className="inline mr-0.5" />{b.phone}</span>}
                              {b.email && <span><Mail size={10} className="inline mr-0.5" />{b.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Financial Progress */}
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-moss">Paid: {formatCurrency(b.totalPaid)}</span>
                          <span className="font-medium text-rust">Owes: {formatCurrency(b.remaining)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-line dark:bg-ink rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all bg-moss" style={{ width: `${b.recoveryPercent}%` }} />
                        </div>
                        <div className="text-[10px] text-ink-muted mt-1 text-right">{b.recoveryPercent.toFixed(1)}% Recovered</div>
                      </td>

                      {/* Status & Risk */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5 items-start">
                          {getStatusBadge(b.status)}
                          {getRiskBadge(b.riskLevel)}
                        </div>
                      </td>

                      {/* Key Dates */}
                      <td className="px-4 py-3 text-xs">
                        <div className="text-ink-muted mb-1">
                          Due: <span className={`font-medium ${b.status === "Overdue" ? "text-rust" : "text-ink dark:text-paper"}`}>{b.nextDueDate ? formatDate(b.nextDueDate) : "—"}</span>
                        </div>
                        <div className="text-ink-muted text-[11px]">
                          Paid: {b.lastPaymentDate ? formatDate(b.lastPaymentDate) : "Never"}
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {b.phone && <a href={`https://wa.me/${b.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-7 h-7 flex items-center justify-center rounded bg-moss-light/30 text-moss hover:bg-moss-light transition" title="WhatsApp"><MessageCircle size={14}/></a>}
                          {b.email && <a href={`mailto:${b.email}`} className="w-7 h-7 flex items-center justify-center rounded bg-paper-muted dark:bg-ink text-ink-muted hover:text-ink transition" title="Email"><Mail size={14}/></a>}
                          <Link href={`/borrowers/${b.id}`} className="btn-secondary !py-1 !px-2 text-xs border-line dark:border-ink-light">View</Link>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Footer */}
          {!loading && filteredAndSortedData.length > 0 && (
            <div className="border-t border-line dark:border-ink-light p-4 flex items-center justify-between text-sm">
              <span className="text-ink-muted">
                Showing {((page - 1) * rowsPerPage) + 1} to {Math.min(page * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded border border-line dark:border-ink-light disabled:opacity-50 hover:bg-paper-muted dark:hover:bg-ink"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="w-8 h-8 flex items-center justify-center font-medium bg-ink text-white dark:bg-paper dark:text-ink rounded">{page}</div>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded border border-line dark:border-ink-light disabled:opacity-50 hover:bg-paper-muted dark:hover:bg-ink"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Add Borrower CRM Modal */}
      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="Add New Borrower">
        <form onSubmit={handleAddBorrower} className="space-y-4">
          <div>
            <label className="label-text">Full Name</label>
            <input className="input-field" required value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Phone Number</label>
              <input className="input-field" placeholder="+91..." value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Email Address</label>
              <input type="email" className="input-field" placeholder="john@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-text">Private Lender Notes & Tags</label>
            <textarea className="input-field" rows={3} placeholder="Add background info, risk assessment, or custom tags..." value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full h-10">
            {submitting ? "Adding..." : "Add Borrower Profile"}
          </button>
        </form>
      </Modal>

      {/* Delete / Archive Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={handleCancelDelete} title="Delete or Archive Borrower(s)">
        <div className="space-y-4">
          <div className="p-4 bg-paper-muted dark:bg-ink rounded-card space-y-2 text-sm">
            <div>
              <span className="font-semibold text-ink-muted">Borrower(s):</span>{" "}
              <span className="font-bold text-ink dark:text-paper">{deleteStats.names}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line dark:border-ink-light">
              <div>
                <div className="text-xs text-ink-muted">Loans</div>
                <div className="font-semibold tabular">{deleteStats.loansCount}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Payments</div>
                <div className="font-semibold tabular">{deleteStats.paymentsCount}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Outstanding</div>
                <div className="font-semibold text-rust tabular">{formatCurrency(deleteStats.outstanding)}</div>
              </div>
            </div>
          </div>

          {deleteStats.hasActiveLoans ? (
            <div className="p-3 bg-rust-light/20 border border-rust/20 text-rust rounded-card text-xs flex gap-2">
              <span>⛔</span>
              <span>
                <strong>Cannot delete permanently:</strong> Active/unsettled loans exist for this borrower. You must close all active loans first, or <strong>Archive</strong> the borrower to hide them from lists while preserving data.
              </span>
            </div>
          ) : deleteStats.outstanding > 0 || deleteStats.loansCount > 0 || deleteStats.paymentsCount > 0 ? (
            <div className="p-3 bg-amber-light/20 border border-amber/20 text-amber rounded-card text-xs flex gap-2">
              <span>⚠️</span>
              <span>
                <strong>Warning:</strong> Deleting permanently will completely purge all loans, repayments, and payment history from the database. Consider <strong>Archiving</strong> instead to preserve histories.
              </span>
            </div>
          ) : (
            <div className="p-3 bg-moss-light/20 border border-moss/20 text-moss rounded-card text-xs flex gap-2">
              <span>✓</span>
              <span>This borrower has no active loans, payment history, or outstanding balance. Safe to delete permanently.</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button 
              type="button" 
              onClick={handleCancelDelete} 
              disabled={deletingSubmitting} 
              className="btn-secondary text-xs h-9 px-4 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => executeDeleteOrArchive("archive")} 
              disabled={deletingSubmitting} 
              className="btn-secondary text-xs h-9 px-4 hover:bg-paper-muted dark:hover:bg-ink disabled:opacity-50"
            >
              {deletingSubmitting ? "Processing..." : "Archive"}
            </button>
            <button 
              type="button" 
              onClick={() => executeDeleteOrArchive("permanent")} 
              disabled={deletingSubmitting || deleteStats.hasActiveLoans} 
              className="btn-primary bg-rust hover:bg-rust/90 border-rust text-white text-xs h-9 px-4 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {deletingSubmitting ? "Processing..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
