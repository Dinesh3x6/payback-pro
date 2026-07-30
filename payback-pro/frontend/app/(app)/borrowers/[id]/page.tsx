"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Mail, Phone, Pencil, Wallet, Calendar, TrendingUp, MapPin, 
  Camera, X, Tag, Plus, CheckCircle2, Clock, Bell, FileText, Activity, MessageCircle,
  Star, Flag, Users
} from "lucide-react";
import toast from "react-hot-toast";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Modal } from "@/components/modal";
import { ChannelSelector, ChannelName } from "@/components/ChannelSelector";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AIEngine } from "@/lib/ai-engine";
import { useWorkspace } from "@/lib/workspace-context";
import { Sparkles } from "lucide-react";

// --- Types ---
interface Repayment { id: string; amount: string; paidAt: string; note?: string; }
interface Loan { id: string; principal: string; interestRate: string; status: string; dueDate: string | null; createdAt: string; repayments: Repayment[]; }
interface Reminder { id: string; channels: string[]; message: string; status: string; createdAt: string; history: { id: string; channel: string; status: string; response: string | null; sentAt: string }[]; }
interface Borrower { id: string; name: string; phone?: string; email?: string; notes?: string; photoUrl?: string; tags?: string[]; createdAt: string; loans: Loan[]; reminders: Reminder[]; }

// --- Timeline Item Type ---
type TimelineEvent = {
  id: string;
  type: "LOAN" | "REPAYMENT" | "REMINDER" | "INTERACTION" | "FOLLOWUP";
  date: string;
  title: string;
  description?: string;
  status?: string;
};

// --- CRM Types ---
interface Interaction { id: string; date: string; type: "PHONE" | "EMAIL" | "MEETING"; note: string; }
interface FollowUp { id: string; date: string; note: string; status: "PENDING" | "COMPLETED"; }

// --- Financials Calculator ---
function computeFinancials(loans: Loan[]) {
  let totalLoan = 0;
  let totalPaid = 0;
  let lastPaymentDate: string | null = null;
  for (const l of loans) {
    const principal = Number(l.principal);
    const interest = principal * (Number(l.interestRate) / 100);
    totalLoan += principal + interest;
    for (const r of l.repayments) {
      totalPaid += Number(r.amount);
      if (!lastPaymentDate || new Date(r.paidAt) > new Date(lastPaymentDate)) {
        lastPaymentDate = r.paidAt;
      }
    }
  }
  const remaining = Math.max(totalLoan - totalPaid, 0);
  const progress = totalLoan > 0 ? Math.min((totalPaid / totalLoan) * 100, 100) : 0;
  return { totalLoan, totalPaid, remaining, progress, lastPaymentDate };
}

export default function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole } = useWorkspace();
  const isStaff = activeRole === "Staff";
  
  const [borrower, setBorrower] = useState<Borrower | null>(null);

  // Parsed Notes/Address/CRM
  const [parsedAddress, setParsedAddress] = useState("");
  const [parsedNotes, setParsedNotes] = useState("");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [rating, setRating] = useState<number>(0);

  // Add loan form
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [dueDate, setDueDate] = useState("");

  // Edit borrower modal
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Photo Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Record payment modal
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Send reminder form
  const [channels, setChannels] = useState<ChannelName[]>(["EMAIL"]);
  const [message, setMessage] = useState("Hi {name}, this is a friendly reminder that your payment of ₹{amount} is due. Please pay at your earliest convenience.");
  const [sending, setSending] = useState(false);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TIMELINE" | "CRM">("OVERVIEW");

  // CRM Forms
  const [interactionType, setInteractionType] = useState<"PHONE"|"EMAIL"|"MEETING">("PHONE");
  const [interactionNote, setInteractionNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    load();
  }, [id]);

  async function load() {
    try {
      const data = await apiGet<Borrower>(`/borrowers/${id}`);
      setBorrower(data);
      // Parse Address / Notes from backend 'notes' string safely
      let addr = "";
      let nts = data.notes ?? "";
      try {
        const obj = JSON.parse(data.notes || "{}");
        if (typeof obj === 'object') {
          addr = obj.address ?? "";
          nts = obj.notes ?? "";
          setInteractions(obj.interactions || []);
          setFollowUps(obj.followUps || []);
          setRating(obj.rating || 0);
        }
      } catch (e) { /* fallback to treating it as just raw notes */ }
      setParsedAddress(addr);
      setParsedNotes(nts);
    } catch (err) {
      toast.error("Failed to load borrower");
    }
  }

  // --- Photo Upload Logic (Client-Side Compression to Base64) ---
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX = 250; // resize to max 250px to keep base64 tiny
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } 
        else { if (h > MAX) { w *= MAX/h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        
        const base64 = canvas.toDataURL("image/jpeg", 0.85); // Compress quality
        
        try {
          await apiPut(`/borrowers/${id}`, { photoUrl: base64 });
          toast.success("Profile photo updated");
          load();
        } catch {
          toast.error("Failed to update photo");
        } finally {
          setUploadingPhoto(false);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- Edit Borrower Handlers ---
  function openEdit() {
    if (isStaff) { toast.error("Staff members cannot edit profiles."); return; }
    if (!borrower) return;
    setEditName(borrower.name);
    setEditPhone(borrower.phone ?? "");
    setEditEmail(borrower.email ?? "");
    setEditAddress(parsedAddress);
    setEditNotes(parsedNotes);
    setEditTags(borrower.tags ?? []);
    setTagInput("");
    setEditing(true);
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const t = tagInput.trim().toUpperCase();
      if (t && !editTags.includes(t)) {
        setEditTags([...editTags, t]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  async function updateNotesJson(newFields: any) {
    const combined = JSON.stringify({
      address: parsedAddress,
      notes: parsedNotes,
      interactions,
      followUps,
      rating,
      ...newFields
    });
    await apiPut(`/borrowers/${id}`, { notes: combined });
    load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const combinedNotes = JSON.stringify({ address: editAddress, notes: editNotes, interactions, followUps, rating });
      await apiPut(`/borrowers/${id}`, {
        name: editName,
        phone: editPhone || undefined,
        email: editEmail || undefined,
        notes: combinedNotes,
        tags: editTags
      });
      toast.success("Borrower updated");
      setEditing(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not update borrower");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function toggleTag(tag: string) {
    if (isStaff) return;
    const currentTags = borrower?.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
    await apiPut(`/borrowers/${id}`, { tags: newTags });
    load();
  }

  // --- CRM Handlers ---
  async function addInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!interactionNote) return;
    const newInteraction: Interaction = { id: Date.now().toString(), date: new Date().toISOString(), type: interactionType, note: interactionNote };
    await updateNotesJson({ interactions: [newInteraction, ...interactions] });
    setInteractionNote("");
    toast.success("Interaction logged");
  }

  async function addFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpDate || !followUpNote) return;
    const newFollowUp: FollowUp = { id: Date.now().toString(), date: new Date(followUpDate).toISOString(), note: followUpNote, status: "PENDING" };
    await updateNotesJson({ followUps: [...followUps, newFollowUp] });
    setFollowUpDate(""); setFollowUpNote("");
    toast.success("Follow-up scheduled");
  }

  async function completeFollowUp(fId: string) {
    const updated = followUps.map(f => f.id === fId ? { ...f, status: "COMPLETED" as const } : f);
    await updateNotesJson({ followUps: updated });
  }

  // --- Other Handlers ---
  function openPayment(loan: Loan) {
    setPayingLoan(loan);
    setPayAmount(""); setPayNote("");
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingLoan) return;
    setPaySubmitting(true);
    try {
      await apiPost(`/loans/${payingLoan.id}/repayments`, {
        amount: Number(payAmount), note: payNote || undefined,
      });
      toast.success("Payment recorded");
      setPayingLoan(null);
      load();
    } catch {
      toast.error("Could not record payment");
    } finally {
      setPaySubmitting(false);
    }
  }

  async function addLoan(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost("/loans", {
        borrowerId: id, principal: Number(principal), interestRate: Number(interestRate),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setPrincipal(""); setInterestRate("0"); setDueDate("");
      toast.success("Loan added");
      load();
    } catch {
      toast.error("Could not add loan");
    }
  }

  async function sendReminder(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const personalized = message.replace("{name}", borrower?.name ?? "");
      await apiPost("/reminders/send-now", {
        borrowerId: id, channels, message: personalized, loanId: borrower?.loans[0]?.id,
      });
      toast.success("✓ Email Sent Successfully");
      load();
    } catch (err: any) {
      // Extract the specific error message from the backend response
      const apiMessage = err?.response?.data?.message;
      if (apiMessage) {
        toast.error(`❌ Failed: ${apiMessage}`, { duration: 6000 });
      } else {
        toast.error("❌ Failed to send reminder — check server logs for details.");
      }
    } finally {
      setSending(false);
    }
  }

  // --- Build Unified Timeline ---
  const timelineEvents = useMemo(() => {
    if (!borrower) return [];
    const events: TimelineEvent[] = [];
    
    // Add Loans
    borrower.loans.forEach(l => {
      events.push({
        id: `loan-${l.id}`, type: "LOAN", date: l.createdAt,
        title: `Loan Created for ${formatCurrency(Number(l.principal))}`,
        description: `Interest Rate: ${l.interestRate}%`
      });
      // Add Repayments
      l.repayments.forEach(r => {
        events.push({
          id: `pay-${r.id}`, type: "REPAYMENT", date: r.paidAt,
          title: `Payment Received: ${formatCurrency(Number(r.amount))}`,
          description: r.note || "No notes attached"
        });
      });
    });

    // Add Reminders
    borrower.reminders.forEach(rm => {
      events.push({
        id: `rem-${rm.id}`, type: "REMINDER", date: rm.createdAt,
        title: `Reminder Sent via ${rm.channels.join(", ")}`,
        description: rm.message,
        status: rm.status
      });
    });

    // Add CRM Interactions
    interactions.forEach(int => {
      events.push({
        id: `int-${int.id}`, type: "INTERACTION", date: int.date,
        title: `Logged ${int.type.charAt(0) + int.type.slice(1).toLowerCase()} Interaction`,
        description: int.note
      });
    });

    // Add CRM Follow-ups
    followUps.forEach(f => {
      events.push({
        id: `fol-${f.id}`, type: "FOLLOWUP", date: f.date,
        title: `Follow-up Scheduled`,
        description: f.note,
        status: f.status
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [borrower, interactions, followUps]);

  if (!borrower) {
    return (
      <div>
        <Navbar title="Borrower Profile" />
        <main className="px-5 py-6 max-w-4xl mx-auto text-sm text-ink-muted text-center pt-20">Loading profile data…</main>
      </div>
    );
  }

  const fin = computeFinancials(borrower.loans);
  
  // AI Insight
  const engine = new AIEngine({ borrowers: [borrower] });
  const insight = engine.getBorrowerInsight(borrower);
  const collectionIntel = engine.getCollectionIntelligence(borrower);

  return (
    <div>
      <Navbar title={borrower.name} />
      <main className="px-5 py-6 max-w-5xl mx-auto">
        <button onClick={() => router.push("/borrowers")} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink dark:hover:text-paper mb-4 transition">
          <ArrowLeft size={15} /> Back to CRM
        </button>

        {/* ── CRM Profile Header ── */}
        <div className="stub-card p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-moss/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          {/* Avatar with Upload Hover */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full bg-paper-muted dark:bg-ink flex items-center justify-center overflow-hidden border-2 border-line dark:border-ink-light shadow-sm">
              {borrower.photoUrl ? (
                <img src={borrower.photoUrl} alt={borrower.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-semibold text-ink-muted">{borrower.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            
            {/* Upload Overlay */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center text-white text-xs cursor-pointer"
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? <Activity className="animate-spin mb-1" size={16} /> : <Camera size={18} className="mb-1" />}
              {uploadingPhoto ? "..." : "Change"}
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelect} className="hidden" />
          </div>

          {/* Profile Details */}
          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-start justify-between gap-4 w-full">
              <div>
                <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
                  {borrower.name}
                  {(borrower.tags ?? []).map(t => (
                    <span key={t} className="badge bg-amber-light text-amber text-[10px] uppercase py-0">{t}</span>
                  ))}
                </h1>
                
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-ink-muted">
                  {borrower.phone && <a href={`tel:${borrower.phone}`} className="flex items-center gap-1.5 hover:text-ink transition"><Phone size={14} /> {borrower.phone}</a>}
                  {borrower.email && <a href={`mailto:${borrower.email}`} className="flex items-center gap-1.5 hover:text-ink transition"><Mail size={14} /> {borrower.email}</a>}
                  {parsedAddress && <span className="flex items-center gap-1.5 sm:col-span-2 text-xs mt-1"><MapPin size={14} className="shrink-0"/> {parsedAddress}</span>}
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                <button 
                  onClick={() => toggleTag("FAVORITE")} 
                  className={`btn-secondary !px-2 transition ${borrower.tags?.includes("FAVORITE") ? 'bg-amber-light text-amber border-amber' : ''}`}
                  title="Toggle Favorite"
                >
                  <Star size={15} className={borrower.tags?.includes("FAVORITE") ? 'fill-amber text-amber' : ''} />
                </button>
                <button 
                  onClick={() => toggleTag("PRIORITY")} 
                  className={`btn-secondary !px-2 transition ${borrower.tags?.includes("PRIORITY") ? 'bg-rust-light text-rust border-rust' : ''}`}
                  title="Toggle Priority"
                >
                  <Flag size={15} className={borrower.tags?.includes("PRIORITY") ? 'fill-rust text-rust' : ''} />
                </button>
                {borrower.phone && (
                  <a href={`https://wa.me/${borrower.phone.replace(/\D/g, '')}`} target="_blank" className="btn-secondary !px-2"><MessageCircle size={15}/></a>
                )}
                <button onClick={openEdit} disabled={isStaff} className="btn-primary shrink-0 disabled:opacity-50"><Pencil size={15} className="mr-1.5 inline" /> Edit Profile</button>
              </div>
            </div>

            {/* AI Insight Badge */}
            <div className="mt-4 inline-flex items-center gap-2 bg-moss/10 text-moss px-3 py-1.5 rounded-md border border-moss/20">
              <Sparkles size={14} className="shrink-0" />
              <span className="text-xs font-medium">AI Insight: {insight.text}</span>
            </div>

            {parsedNotes && (
              <div className="mt-5 p-3 bg-amber-light/20 border border-amber/10 rounded-card text-sm text-ink-muted flex items-start gap-2">
                <FileText size={15} className="text-amber mt-0.5 shrink-0" />
                <p>{parsedNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="mt-6 border-b border-line dark:border-ink-light flex gap-6 px-2">
          <button 
            className={`pb-3 text-sm font-medium transition ${activeTab === 'OVERVIEW' ? 'border-b-2 border-ink dark:border-paper text-ink dark:text-paper' : 'text-ink-muted hover:text-ink'}`}
            onClick={() => setActiveTab("OVERVIEW")}
          >
            Financial Overview
          </button>
          <button 
            className={`pb-3 text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'TIMELINE' ? 'border-b-2 border-ink dark:border-paper text-ink dark:text-paper' : 'text-ink-muted hover:text-ink'}`}
            onClick={() => setActiveTab("TIMELINE")}
          >
            Activity Timeline <span className="bg-paper-muted dark:bg-ink text-[10px] px-1.5 py-0.5 rounded-full">{timelineEvents.length}</span>
          </button>
          <button 
            className={`pb-3 text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'CRM' ? 'border-b-2 border-ink dark:border-paper text-ink dark:text-paper' : 'text-ink-muted hover:text-ink'}`}
            onClick={() => setActiveTab("CRM")}
          >
            <Users size={14} /> CRM & Relationship
          </button>
        </div>

        {/* ── TAB CONTENT: OVERVIEW ── */}
        {activeTab === "OVERVIEW" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Financial Summary */}
            <div className="stub-card p-6 mt-5 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="label-text">Total Lent</p>
                <p className="text-xl font-display font-semibold tabular">{formatCurrency(fin.totalLoan)}</p>
              </div>
              <div>
                <p className="label-text">Total Recovered</p>
                <p className="text-xl font-display font-semibold tabular text-moss">{formatCurrency(fin.totalPaid)}</p>
              </div>
              <div>
                <p className="label-text">Outstanding Balance</p>
                <p className={`text-xl font-display font-semibold tabular ${fin.remaining > 0 ? "text-rust" : "text-moss"}`}>
                  {formatCurrency(fin.remaining)}
                </p>
              </div>
              <div>
                <p className="label-text">Payment Progress</p>
                <div className="flex items-center justify-between mb-1 text-sm font-medium">
                  <span>{fin.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-paper-muted dark:bg-ink rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-moss" style={{ width: `${fin.progress}%` }} />
                </div>
              </div>
            </div>

            {/* AI Collection Intelligence Widget */}
            <div className="mt-5 stub-card p-6 border-l-4 border-moss relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-moss/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-moss" />
                <h3 className="font-display font-semibold text-lg">AI Collection Intelligence</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>Payment Probability</span>
                      <span>{collectionIntel.paymentProbability}%</span>
                    </div>
                    <div className="w-full h-2 bg-paper-muted dark:bg-ink rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${collectionIntel.paymentProbability < 40 ? "bg-rust" : collectionIntel.paymentProbability < 70 ? "bg-amber" : "bg-moss"}`} style={{ width: `${collectionIntel.paymentProbability}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Collection Score (0-100)</p>
                    <p className="text-xl font-display font-bold tabular flex items-end gap-2">
                      {collectionIntel.collectionScore}
                      <span className={`text-xs pb-1 uppercase tracking-wide ${collectionIntel.riskLevel === 'Critical' ? 'text-rust' : collectionIntel.riskLevel === 'Medium' ? 'text-amber' : 'text-moss'}`}>
                        {collectionIntel.riskLevel} Risk
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="md:col-span-2 space-y-4 bg-paper-muted dark:bg-ink/50 p-4 rounded-card border border-line dark:border-ink-light">
                  <div>
                    <p className="text-xs text-ink-muted mb-1 flex items-center gap-1.5"><Clock size={12}/> Best Time to Remind</p>
                    <p className="font-medium text-sm">{collectionIntel.bestTimeToRemind}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted mb-1 flex items-center gap-1.5"><Activity size={12}/> AI Recommended Strategy</p>
                    <p className="text-sm font-medium">{collectionIntel.strategyNotes}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {/* Active Loans */}
              <div className="stub-card p-6">
                <span className="label-text">Loan Accounts</span>
                <div className="mt-4 space-y-3">
                  {borrower.loans.map((l) => {
                    const paid = l.repayments.reduce((s, r) => s + Number(r.amount), 0);
                    const total = Number(l.principal) * (1 + Number(l.interestRate) / 100);
                    const remaining = Math.max(total - paid, 0);
                    return (
                      <div key={l.id} className="p-4 border border-line dark:border-ink-light rounded-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold tabular">{formatCurrency(Number(l.principal))} @ {l.interestRate}%</span>
                          <span className={`badge ${l.status === "PAID" ? "bg-moss-light text-moss" : l.status === "PARTIAL" ? "bg-amber-light text-amber" : l.status === "OVERDUE" ? "bg-rust-light text-rust" : "bg-amber-light text-amber"}`}>
                            {l.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-ink-muted mb-3">
                          <span>Paid: {formatCurrency(paid)}</span>
                          <span className="text-rust font-medium">Owes: {formatCurrency(remaining)}</span>
                        </div>
                        {l.status !== "PAID" && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => openPayment(l)} disabled={isStaff} className="btn-secondary flex-1 text-xs h-8 disabled:opacity-50">
                              <Wallet size={14} className="inline mr-1.5" /> Record Payment
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await apiPost<any>("/payments/create-order", { loanId: l.id, borrowerId: borrower.id });
                                  window.open(`/pay/${res.payment.razorpayOrderId}`, "_blank");
                                } catch (err: any) {
                                  toast.error("Failed to generate checkout link");
                                }
                              }} 
                              className="btn-primary flex-1 text-xs h-8"
                            >
                              💳 Pay Online
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {borrower.loans.length === 0 && <p className="text-sm text-ink-muted text-center py-4">No loans on record.</p>}
                </div>

                <form onSubmit={addLoan} className="mt-5 border-t border-line dark:border-ink-light pt-5">
                  <span className="label-text flex items-center gap-1"><Plus size={14} /> Issue New Loan</span>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-text">Principal (₹)</label>
                      <input className="input-field" type="number" required value={principal} onChange={(e) => setPrincipal(e.target.value)} />
                    </div>
                    <div>
                      <label className="label-text">Interest Rate %</label>
                      <input className="input-field" type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="label-text">Due Date (Optional)</label>
                      <input className="input-field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" disabled={isStaff} className="btn-secondary w-full mt-4 disabled:opacity-50">Create Loan</button>
                </form>
              </div>

              {/* Quick Reminder Tool */}
              <div className="stub-card p-6 h-fit">
                <span className="label-text flex items-center gap-1.5"><Bell size={14}/> Send Manual Reminder</span>
                <form onSubmit={sendReminder} className="mt-4 space-y-4">
                  <div>
                    <label className="label-text">Communication Channels</label>
                    <ChannelSelector selected={channels} onChange={setChannels} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label-text !mb-0">Message Template</label>
                      <button 
                        type="button" 
                        onClick={() => setMessage(engine.generateSmartReminder(borrower))}
                        className="text-[10px] text-moss flex items-center gap-1 hover:underline"
                      >
                        <Sparkles size={10} /> Auto-generate smart reminder
                      </button>
                    </div>
                    <textarea className="input-field text-sm" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
                    <p className="text-[10px] text-ink-muted mt-1">Variables: {'{name}'} will be replaced automatically.</p>
                  </div>
                  <button type="submit" className="btn-primary w-full h-10 disabled:opacity-50" disabled={sending || channels.length === 0 || isStaff}>
                    {sending ? "⏳ Sending..." : "Send Reminder Now"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: TIMELINE ── */}
        {activeTab === "TIMELINE" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-5 stub-card p-6">
            <h3 className="font-medium text-lg mb-6">Activity & Communication Log</h3>
            
            {timelineEvents.length === 0 ? (
              <p className="text-center text-sm text-ink-muted py-10">No activity recorded for this borrower yet.</p>
            ) : (
              <div className="relative border-l border-line dark:border-ink-light ml-3 space-y-8 pb-4">
                {timelineEvents.map((evt, i) => (
                  <div key={`${evt.id}-${i}`} className="relative pl-6">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-[3px] border-paper dark:border-ink-dark flex items-center justify-center
                      ${evt.type === 'REPAYMENT' ? 'bg-moss-light text-moss' : 
                        evt.type === 'LOAN' ? 'bg-blue-100 text-blue-600' : 
                        evt.type === 'INTERACTION' ? 'bg-purple-100 text-purple-600' :
                        evt.type === 'FOLLOWUP' ? 'bg-pink-100 text-pink-600' :
                        'bg-amber-light text-amber'}
                    `}>
                      {evt.type === 'REPAYMENT' && <Wallet size={12} />}
                      {evt.type === 'LOAN' && <TrendingUp size={12} />}
                      {evt.type === 'REMINDER' && <Bell size={12} />}
                      {evt.type === 'INTERACTION' && <MessageCircle size={12} />}
                      {evt.type === 'FOLLOWUP' && <Calendar size={12} />}
                    </div>
                    
                    {/* Content */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{evt.title}</h4>
                      <time className="text-xs text-ink-muted flex items-center gap-1 shrink-0">
                        <Clock size={12} /> {formatDate(evt.date)}
                      </time>
                    </div>
                    {evt.description && <p className="text-sm text-ink-muted mt-1 bg-paper-muted dark:bg-ink p-2.5 rounded-md inline-block">{evt.description}</p>}
                    {evt.status && (
                      <div className="mt-2">
                         <span className={`text-[10px] uppercase font-semibold tracking-wide ${evt.status === 'SUCCESS' || evt.status === 'SENT' ? 'text-moss' : 'text-rust'}`}>
                           Status: {evt.status}
                         </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT: CRM ── */}
        {activeTab === "CRM" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-5 grid gap-5 lg:grid-cols-2">
            
            {/* Interactions Logger */}
            <div className="stub-card p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2"><MessageCircle size={16} /> Log Interaction</h3>
              </div>
              <form onSubmit={addInteraction} className="space-y-4">
                <div>
                  <label className="label-text">Interaction Type</label>
                  <div className="flex gap-2">
                    {["PHONE", "EMAIL", "MEETING"].map(type => (
                      <button 
                        key={type} type="button" 
                        onClick={() => setInteractionType(type as any)}
                        className={`flex-1 h-8 text-xs font-medium rounded-md border transition-colors ${interactionType === type ? 'bg-ink text-paper border-ink dark:bg-paper dark:text-ink' : 'bg-transparent text-ink-muted border-line hover:border-ink'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-text">Interaction Summary</label>
                  <textarea className="input-field text-sm" rows={3} required placeholder="What was discussed?" value={interactionNote} onChange={e => setInteractionNote(e.target.value)} />
                </div>
                <button type="submit" disabled={isStaff} className="btn-secondary w-full disabled:opacity-50">Save Interaction</button>
              </form>

              <div className="mt-6 border-t border-line dark:border-ink-light pt-6 space-y-4">
                <span className="label-text text-xs">Recent Interactions ({interactions.length})</span>
                {interactions.slice(0, 5).map(int => (
                  <div key={int.id} className="p-3 bg-paper-muted dark:bg-ink/50 rounded-md border border-line dark:border-ink-light">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-ink">{int.type}</span>
                      <span className="text-ink-muted">{formatDate(int.date)}</span>
                    </div>
                    <p className="text-sm text-ink-muted">{int.note}</p>
                  </div>
                ))}
                {interactions.length === 0 && <p className="text-xs text-ink-muted">No interactions logged yet.</p>}
              </div>
            </div>

            {/* Follow-up Scheduler */}
            <div className="stub-card p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2"><Calendar size={16} /> Schedule Follow-up</h3>
              </div>
              <form onSubmit={addFollowUp} className="space-y-4">
                <div>
                  <label className="label-text">Date & Time</label>
                  <input type="datetime-local" className="input-field text-sm" required value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Follow-up Task</label>
                  <input type="text" className="input-field text-sm" required placeholder="e.g. Call to check if salary arrived" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} />
                </div>
                <button type="submit" disabled={isStaff} className="btn-secondary w-full disabled:opacity-50">Schedule Follow-up</button>
              </form>

              <div className="mt-6 border-t border-line dark:border-ink-light pt-6 space-y-4">
                <span className="label-text text-xs">Pending Follow-ups ({followUps.filter(f => f.status === 'PENDING').length})</span>
                {followUps.filter(f => f.status === 'PENDING').map(f => (
                  <div key={f.id} className="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-md border border-pink-100 dark:border-pink-900/50">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div>
                        <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 block">{formatDate(f.date)}</span>
                        <p className="text-sm text-ink mt-0.5">{f.note}</p>
                      </div>
                      <button onClick={() => completeFollowUp(f.id)} disabled={isStaff} className="text-moss hover:bg-moss/10 p-1 rounded transition-colors disabled:opacity-50" title="Mark complete">
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {followUps.filter(f => f.status === 'PENDING').length === 0 && <p className="text-xs text-ink-muted">No pending follow-ups.</p>}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── Edit Borrower Modal ── */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit CRM Profile">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="label-text">Full Name</label>
            <input className="input-field" required value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Phone Number</label>
              <input className="input-field" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Email Address</label>
              <input type="email" className="input-field" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-text">Physical Address</label>
            <input className="input-field" placeholder="123 Main St..." value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Tags / Categories (Press Enter)</label>
            <div className="input-field flex flex-wrap gap-2 items-center !p-1.5 focus-within:ring-2 focus-within:ring-ink focus-within:border-transparent">
              {editTags.map(tag => (
                <span key={tag} className="bg-paper-muted dark:bg-ink text-xs px-2 py-1 rounded-sm flex items-center gap-1 font-medium">
                  {tag} <X size={12} className="cursor-pointer hover:text-rust" onClick={() => removeTag(tag)}/>
                </span>
              ))}
              <input 
                type="text" 
                className="flex-1 min-w-[100px] h-full outline-none bg-transparent px-1 text-sm" 
                placeholder={editTags.length === 0 ? "Add tags..." : ""}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            </div>
          </div>
          <div>
            <label className="label-text">Private Notes</label>
            <textarea className="input-field" rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={editSubmitting} className="btn-primary w-full h-10 mt-2">
            {editSubmitting ? "Saving Profile…" : "Save Changes"}
          </button>
        </form>
      </Modal>

      {/* ── Record Payment Modal ── */}
      <Modal open={!!payingLoan} onClose={() => setPayingLoan(null)} title="Record Payment">
        {payingLoan && (() => {
          const paid = payingLoan.repayments.reduce((s, r) => s + Number(r.amount), 0);
          const total = Number(payingLoan.principal) * (1 + Number(payingLoan.interestRate) / 100);
          const remaining = Math.max(total - paid, 0);
          return (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-paper-muted dark:bg-ink rounded-card mb-2">
                <div>
                  <p className="text-ink-muted">Total Loan</p>
                  <p className="font-semibold tabular">{formatCurrency(total)}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Pending Balance</p>
                  <p className="font-semibold tabular text-rust">{formatCurrency(remaining)}</p>
                </div>
              </div>
              <div>
                <label className="label-text">Amount Received (₹)</label>
                <input className="input-field font-display text-lg" type="number" required min={1} max={remaining} step="any" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={`Max: ${remaining}`} />
              </div>
              <div>
                <label className="label-text">Transaction Note / Reference ID</label>
                <input className="input-field" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="e.g. UPI / Cash / Cheque #12345" />
              </div>
              <button type="submit" disabled={paySubmitting || !payAmount} className="btn-primary w-full h-10">
                {paySubmitting ? "Processing…" : "Confirm Payment"}
              </button>
            </form>
          );
        })()}
      </Modal>

    </div>
  );
}
