import Link from "next/link";
import { ArrowRight, HandCoins, QrCode, BellRing } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <HandCoins size={22} />
          PayBack Reminder
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/sign-in" className="btn-secondary">Sign in</Link>
          <Link href="/sign-up" className="btn-primary">Get started</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="label-text">A ledger for money you've lent</p>
          <h1 className="text-4xl md:text-5xl font-display font-semibold leading-tight text-ink dark:text-paper">
            Never chase a borrower again.
          </h1>
          <p className="mt-5 text-ink-muted dark:text-paper/70 text-lg leading-relaxed">
            Log every rupee you lend, watch balances update as partial payments come in,
            and let automatic UPI-QR reminders do the following up for you.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/sign-up" className="btn-primary">
              Start tracking free <ArrowRight size={16} />
            </Link>
            <Link href="/sign-in" className="btn-secondary">I have an account</Link>
          </div>
        </div>

        <div className="stub-card p-6">
          <div className="pt-3 flex items-center justify-between">
            <span className="label-text mb-0">This month</span>
            <span className="badge bg-moss-light text-moss">On track</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-semibold tabular">₹42,000</p>
              <p className="text-xs text-ink-muted mt-1">Lent</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold tabular text-amber">₹18,500</p>
              <p className="text-xs text-ink-muted mt-1">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold tabular text-moss">₹23,500</p>
              <p className="text-xs text-ink-muted mt-1">Recovered</p>
            </div>
          </div>
          <div className="mt-6 border-t border-dashed border-line pt-4 flex items-center gap-3 text-sm text-ink-muted">
            <QrCode size={18} />
            Borrowers pay in one scan — the QR carries the exact amount due.
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-ink-muted">
            <BellRing size={18} />
            Reminders stop the moment a debt is marked paid.
          </div>
        </div>
      </section>
    </main>
  );
}
