"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, CreditCard, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

// Declarations for Razorpay Web Checkout JS
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentDetails {
  payment: {
    id: string;
    razorpayOrderId: string;
    amount: string;
    status: string;
    loanId: string;
    borrowerId: string;
  };
  keyId: string;
  borrower?: {
    name: string;
    email?: string;
    phone?: string;
  };
  loan?: {
    principal: string;
    interestRate: string;
    dueDate?: string | null;
  };
  lenderName?: string;
  upiId?: string;
  upiName?: string;
  upiLink?: string;
  qrCodeBase64?: string;
}

export default function CheckoutPage() {
  const { token } = useParams<{ token: string }>();
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">("PENDING");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = typeof window !== "undefined" ? (navigator.userAgent || navigator.vendor || (window as any).opera) : "";
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };
    setIsMobile(checkMobile());
  }, []);

  useEffect(() => {
    if (!token) return;

    apiGet<PaymentDetails>(`/payments/order/${token}`)
      .then((res) => {
        setDetails(res);
        if (res.payment.status === "PAID") {
          setStatus("SUCCESS");
        }
        setLoading(false);
        
        // Auto-attempt opening the UPI deep link on mobile devices
        const userAgent = typeof window !== "undefined" ? (navigator.userAgent || navigator.vendor || (window as any).opera) : "";
        const isMob = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        if (isMob && res.upiLink) {
          window.location.href = res.upiLink;
        }
      })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.message ?? "Failed to retrieve order details");
        setLoading(false);
      });
  }, [token]);

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!details) return;
    setPaying(true);
    setErrorMsg(null);

    const isMock = details.payment.razorpayOrderId.startsWith("mock_order_");
    if (isMock) {
      setTimeout(async () => {
        try {
          await apiPost("/payments/verify", {
            razorpay_order_id: details.payment.razorpayOrderId,
            razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(2, 10),
            razorpay_signature: "mock_signature",
          });
          setStatus("SUCCESS");
        } catch (err: any) {
          setStatus("FAILED");
          setErrorMsg(err?.response?.data?.message ?? "Verification failed");
        } finally {
          setPaying(false);
        }
      }, 1500);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMsg("Failed to load payment gateway script. Please check your internet connection.");
      setPaying(false);
      return;
    }

    const amountInPaise = Math.round(Number(details.payment.amount) * 100);

    const options = {
      key: details.keyId,
      amount: amountInPaise,
      currency: "INR",
      name: "PayBack Pro",
      description: "Secure Loan Repayment",
      order_id: details.payment.razorpayOrderId,
      prefill: {
        name: details.borrower?.name ?? "",
        email: details.borrower?.email ?? "",
        contact: details.borrower?.phone ?? "",
      },
      theme: {
        color: "#6C63FF",
      },
      handler: async (response: any) => {
        setLoading(true);
        try {
          await apiPost("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setStatus("SUCCESS");
        } catch (err: any) {
          setStatus("FAILED");
          setErrorMsg(err?.response?.data?.message ?? "Verification failed");
        } finally {
          setLoading(false);
          setPaying(false);
        }
      },
      modal: {
        ondismiss: () => {
          setPaying(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#f4f5f7] dark:bg-ink p-6">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-sm font-medium text-ink-muted">Loading secure checkout...</p>
      </main>
    );
  }

  if (status === "SUCCESS") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-ink px-6">
        <div className="w-full max-w-md bg-white dark:bg-ink-light rounded-2xl shadow-xl p-8 border border-line dark:border-ink-light text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-moss-light dark:bg-moss/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-moss" size={36} />
          </div>
          <h1 className="text-2xl font-display font-bold text-ink dark:text-paper mb-2">Payment Successful!</h1>
          <p className="text-sm text-ink-muted mb-6">Your transaction has been processed and your outstanding loan balance updated.</p>

          <div className="bg-[#f8f9ff] dark:bg-ink/50 border border-line dark:border-ink-light rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Payment ID</span>
              <span className="font-semibold text-ink dark:text-paper">{details?.payment.id}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Amount Paid</span>
              <span className="font-semibold text-moss">{formatCurrency(Number(details?.payment.amount ?? 0))}</span>
            </div>
            {details?.borrower?.name && (
              <div className="flex justify-between text-xs text-ink-muted">
                <span>Borrower</span>
                <span className="font-semibold text-ink dark:text-paper">{details.borrower.name}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-ink-muted">A receipt has been dispatched to your email address.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-ink px-6 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-ink-light rounded-2xl shadow-xl overflow-hidden border border-line dark:border-ink-light animate-in fade-in duration-300">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white text-center">
          <h1 className="text-2xl font-display font-bold">PayBack Pro</h1>
          <p className="text-xs text-white/80 mt-1">Secure Online Checkout</p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center">
            <p className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Outstanding Amount to Pay</p>
            <p className="text-4xl font-display font-extrabold text-indigo-500 mt-2">
              {formatCurrency(Number(details?.payment.amount ?? 0))}
            </p>
          </div>

          {/* Details breakdown */}
          <div className="bg-[#f8f9ff] dark:bg-ink/50 border border-line dark:border-ink-light rounded-xl p-4 space-y-3">
            {details?.borrower?.name && (
              <div className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light/50 pb-2">
                <span className="text-ink-muted text-xs">Borrower Name</span>
                <span className="font-semibold text-ink dark:text-paper">{details.borrower.name}</span>
              </div>
            )}
            {details?.lenderName && (
              <div className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light/50 pb-2">
                <span className="text-ink-muted text-xs">Lender Name</span>
                <span className="font-semibold text-ink dark:text-paper">{details.lenderName}</span>
              </div>
            )}
            {details?.payment.loanId && (
              <div className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light/50 pb-2">
                <span className="text-ink-muted text-xs">Loan ID</span>
                <span className="font-mono text-xs text-ink dark:text-paper">{details.payment.loanId.substring(0, 8)}...</span>
              </div>
            )}
            {details?.loan?.principal && (
              <div className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light/50 pb-2">
                <span className="text-ink-muted text-xs">Loan Principal</span>
                <span className="font-medium text-ink dark:text-paper">
                  {formatCurrency(Number(details.loan.principal))}
                </span>
              </div>
            )}
            {details?.loan?.interestRate && (
              <div className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light/50 pb-2">
                <span className="text-ink-muted text-xs">Interest Rate</span>
                <span className="font-medium text-ink dark:text-paper">{details.loan.interestRate}%</span>
              </div>
            )}
            {details?.loan?.dueDate && (
              <div className="flex justify-between items-center text-sm border-b border-line dark:border-ink-light/50 pb-2">
                <span className="text-ink-muted text-xs">Due Date</span>
                <span className="font-medium text-ink dark:text-paper">
                  {new Date(details.loan.dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink-muted text-xs">Payment Status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${details?.payment.status === "PAID" ? "bg-moss-light/20 text-moss" : "bg-amber-500/10 text-amber-500"}`}>
                {details?.payment.status}
              </span>
            </div>
          </div>

          {/* Dynamic Payment QR Code & Mobile Launch Options */}
          {details?.upiId && (
            <div className="border border-line dark:border-ink-light rounded-xl p-4 space-y-4 text-center">
              {!isMobile && details.qrCodeBase64 ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Scan QR to Pay via UPI</p>
                  <div className="inline-block p-3 bg-white border border-line rounded-lg shadow-sm">
                    <img src={details.qrCodeBase64} alt="UPI QR Code" className="w-48 h-48 mx-auto" />
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Scan using Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
                  </p>
                  <p className="text-xs font-mono text-ink-muted bg-[#f4f5f7] dark:bg-ink/30 py-1.5 px-2 rounded break-all">
                    UPI ID: {details.upiId}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Select App to Pay via UPI</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={details.upiLink}
                      className="flex flex-col items-center justify-center p-3 border border-line rounded-lg hover:bg-slate-50 transition text-xs font-semibold"
                    >
                      <span className="mb-1 text-base">🟢</span>
                      Google Pay
                    </a>
                    <a
                      href={details.upiLink}
                      className="flex flex-col items-center justify-center p-3 border border-line rounded-lg hover:bg-slate-50 transition text-xs font-semibold"
                    >
                      <span className="mb-1 text-base">🟣</span>
                      PhonePe
                    </a>
                    <a
                      href={details.upiLink}
                      className="flex flex-col items-center justify-center p-3 border border-line rounded-lg hover:bg-slate-50 transition text-xs font-semibold"
                    >
                      <span className="mb-1 text-base">🔵</span>
                      Paytm
                    </a>
                    <a
                      href={details.upiLink}
                      className="flex flex-col items-center justify-center p-3 border border-line rounded-lg hover:bg-slate-50 transition text-xs font-semibold"
                    >
                      <span className="mb-1 text-base">📱</span>
                      BHIM / Others
                    </a>
                  </div>
                  {details.qrCodeBase64 && (
                    <details className="text-left text-xs">
                      <summary className="cursor-pointer text-indigo-500 font-semibold text-center select-none">
                        Show QR Code instead
                      </summary>
                      <div className="text-center mt-3 space-y-3">
                        <div className="inline-block p-3 bg-white border border-line rounded-lg">
                          <img src={details.qrCodeBase64} alt="UPI QR Code" className="w-40 h-40 mx-auto" />
                        </div>
                        <p className="text-xs text-ink-muted">UPI ID: {details.upiId}</p>
                      </div>
                    </details>
                  )}
                </>
              )}
              
              <div className="bg-slate-50 dark:bg-ink/30 rounded p-2.5 text-[11px] text-ink-muted text-left">
                <strong>Instructions:</strong> Verify the outstanding amount and payee name before authorization.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rust-light/20 border border-rust/20 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="text-rust mt-0.5 shrink-0" size={16} />
              <p className="text-xs text-rust font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {details?.payment.status !== "PAID" && (
            <button
              onClick={handlePayment}
              disabled={paying}
              className="btn-primary w-full h-12 text-sm flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing Checkout...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Pay securely with Cards/Net Banking
                  <ArrowRight size={16} className="ml-1" />
                </>
              )}
            </button>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-ink-muted pt-2">
            <ShieldCheck className="text-moss" size={16} />
            <span>Secured with Razorpay SSL 256-bit encryption</span>
          </div>
        </div>
      </div>
    </main>
  );
}
