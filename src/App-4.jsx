import React, { useState, useEffect, useCallback } from "react";
import {
  AudioWaveform, Calendar, Clock, Phone, User, MapPin, Video,
  CheckCircle2, XCircle, Search, ShieldCheck, ChevronRight,
  Loader2, Ear, MessageSquareText, Sparkles, ArrowRight, Copy, Check
} from "lucide-react";

/* ---------------------------------------------------------
   DESIGN TOKENS
   Ink teal + warm paper + muted gold accent.
   Signature element: a spoken-word waveform, used as the
   hero backdrop and as section dividers — literal to a
   speech & hearing practice.
---------------------------------------------------------- */
const INK = "#173438";
const INK_DEEP = "#0F2427";
const PAPER = "#FAF6EE";
const PAPER_DIM = "#F1EBDD";
const GOLD = "#C08A34";
const GOLD_SOFT = "#E4C489";

/* ---------------------------------------------------------
   SUPABASE CONNECTION
   This app is now wired to a real database instead of
   Claude's in-chat storage, so bookings work once this file
   is deployed on your own domain. Uses plain fetch() against
   Supabase's REST API — no extra library needed.
---------------------------------------------------------- */
const SUPABASE_URL = "https://mmqvqudjmquuobryobxw.supabase.co";
const SUPABASE_KEY = "sb_publishable_a0av8ALjS2ZctdGfdWsxcQ_Psk8fMny";

const db = {
  async insertBooking(record) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify([record]),
    });
    if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
    const data = await res.json();
    return data[0];
  },

  async listBookings() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    return res.json();
  },

  async getBookingsByPhone(phoneDigits) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=*&phone=eq.${phoneDigits}&order=created_at.desc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
    return res.json();
  },

  async updateBooking(id, patch) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    const data = await res.json();
    return data[0];
  },
};
const LINE = "#DED4BE";

const SERVICES = [
  { key: "speech", label: "Speech & Language Therapy", icon: MessageSquareText, blurb: "Articulation, language delay, stammering, voice — for children and adults." },
  { key: "audiology", label: "Audiology & Hearing Assessment", icon: Ear, blurb: "Hearing screening, diagnostic evaluation, hearing-aid guidance." },
  { key: "parent", label: "Parent Training", icon: User, blurb: "Practical coaching so home practice reinforces every session." },
];

const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];
const ADMIN_CODE = "sonam2026";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/* ---------------------------------------------------------
   Waveform decorative element
---------------------------------------------------------- */
function Waveform({ className = "", bars = 40, animate = true, color = GOLD }) {
  const [heights] = useState(() =>
    Array.from({ length: bars }, (_, i) => {
      const base = Math.sin(i * 0.4) * 0.5 + 0.5;
      return 0.25 + base * 0.75;
    })
  );
  return (
    <div className={`flex items-end gap-[3px] ${className}`}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h * 100}%`,
            background: color,
            animationDelay: `${i * 0.045}s`,
          }}
          className={`w-[3px] rounded-full ${animate ? "animate-[wave_1.6s_ease-in-out_infinite]" : ""}`}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); opacity: .55; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 my-2 opacity-60">
      <div className="h-px flex-1" style={{ background: LINE }} />
      <AudioWaveform size={16} color={GOLD} />
      <div className="h-px flex-1" style={{ background: LINE }} />
    </div>
  );
}

/* ---------------------------------------------------------
   Nav
---------------------------------------------------------- */
function Nav({ view, setView }) {
  const tabs = [
    { key: "home", label: "Home" },
    { key: "book", label: "Book" },
    { key: "status", label: "My Appointment" },
    { key: "admin", label: "Admin" },
  ];
  return (
    <div className="sticky top-0 z-30 backdrop-blur border-b" style={{ background: `${PAPER}E6`, borderColor: LINE }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => setView("home")} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: INK }}>
            <AudioWaveform size={18} color={GOLD_SOFT} />
          </div>
          <div className="text-left leading-tight">
            <div className="font-semibold tracking-tight" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>Sonam's Clinic</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>Speech &amp; Hearing, Lucknow</div>
          </div>
        </button>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: view === t.key ? INK : "transparent",
                color: view === t.key ? PAPER : INK,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HOME
---------------------------------------------------------- */
function Home({ setView }) {
  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: INK }}>
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-20 relative z-10">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: GOLD_SOFT }}>Speech-Language Pathology · Audiology</div>
          <h1 className="text-4xl md:text-5xl font-medium leading-tight max-w-2xl" style={{ color: PAPER, fontFamily: "'Fraunces', serif" }}>
            Every voice deserves to be understood.
          </h1>
          <p className="mt-5 max-w-xl text-base" style={{ color: "#CBD9D6" }}>
            Sonam works with children and adults on speech, language, stammering and hearing —
            in person in Lucknow, or over video from anywhere in India.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setView("book")} className="px-5 py-3 rounded-full font-medium flex items-center gap-2 transition-transform hover:-translate-y-0.5" style={{ background: GOLD, color: INK_DEEP }}>
              Book a session <ArrowRight size={16} />
            </button>
            <button onClick={() => setView("status")} className="px-5 py-3 rounded-full font-medium border transition-colors" style={{ borderColor: "#3A5A5D", color: PAPER }}>
              Check my appointment
            </button>
          </div>
          <div className="mt-14">
            <Waveform bars={56} className="h-10 opacity-70" />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>Services</div>
        <h2 className="text-2xl font-medium mb-8" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>What we treat</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {SERVICES.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="p-5 rounded-2xl border" style={{ borderColor: LINE, background: PAPER_DIM }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: INK }}>
                  <Icon size={18} color={GOLD_SOFT} />
                </div>
                <div className="font-semibold mb-1" style={{ color: INK }}>{s.label}</div>
                <div className="text-sm" style={{ color: "#5B6B67" }}>{s.blurb}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4"><Divider /></div>

      <section className="max-w-5xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>Clinical Director</div>
          <h2 className="text-2xl font-medium mb-4" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>About Sonam</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#4A5754" }}>
            Sonam is a practicing, RCI-registered speech-language pathologist based in Lucknow.
            Every case is assessed individually and tracked against clear milestones — parents and
            patients get real progress reports, not just reassurance.
          </p>
        </div>
        <div className="rounded-2xl p-8" style={{ background: INK }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} color={GOLD_SOFT} />
            <span className="text-sm font-medium" style={{ color: PAPER }}>RCI Registered Practice</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} color={GOLD_SOFT} />
            <span className="text-sm" style={{ color: "#CBD9D6" }}>In-clinic sessions in Lucknow</span>
          </div>
          <div className="flex items-center gap-2">
            <Video size={18} color={GOLD_SOFT} />
            <span className="text-sm" style={{ color: "#CBD9D6" }}>Teletherapy available pan-India</span>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs" style={{ color: "#8A9793" }}>
        Sonam's Speech &amp; Hearing Clinic · Lucknow, Uttar Pradesh
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------
   BOOKING FLOW
---------------------------------------------------------- */
function BookingForm({ setView }) {
  const [form, setForm] = useState({
    name: "", phone: "", service: SERVICES[0].key, mode: "clinic",
    date: todayISO(), time: TIME_SLOTS[0], notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refId, setRefId] = useState(null);
  const [copied, setCopied] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setSaving(true);
    const id = uid();
    const phoneDigits = form.phone.replace(/\D/g, "").slice(-10);
    const record = {
      id,
      name: form.name,
      phone: phoneDigits,
      service: form.service,
      mode: form.mode,
      date: form.date,
      time: form.time,
      notes: form.notes,
      status: "pending",
      meeting_link: "",
    };
    try {
      await db.insertBooking(record);
      setRefId(id);
    } catch (e) {
      setError("Could not save your booking. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copyRef = () => {
    navigator.clipboard?.writeText(refId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (refId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: INK }}>
          <CheckCircle2 size={26} color={GOLD_SOFT} />
        </div>
        <h2 className="text-2xl font-medium mb-2" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>Request received</h2>
        <p className="text-sm mb-6" style={{ color: "#5B6B67" }}>
          Sonam's clinic will confirm your {form.mode === "teletherapy" ? "teletherapy" : "in-clinic"} slot on{" "}
          {fmtDate(form.date)} at {form.time}. Save your reference number to check status.
        </p>
        <div className="rounded-xl p-4 flex items-center justify-between mb-6" style={{ background: PAPER_DIM, border: `1px solid ${LINE}` }}>
          <span className="font-mono text-sm" style={{ color: INK }}>{refId}</span>
          <button onClick={copyRef} className="flex items-center gap-1 text-xs font-medium" style={{ color: GOLD }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button onClick={() => setView("status")} className="px-5 py-2.5 rounded-full font-medium" style={{ background: INK, color: PAPER }}>
          Check appointment status
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>Book</div>
      <h2 className="text-2xl font-medium mb-6" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>Request an appointment</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "#5B6B67" }}>Full name</label>
          <input value={form.name} onChange={e => update("name", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2"
            style={{ borderColor: LINE, background: "white" }} placeholder="Patient or parent's name" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "#5B6B67" }}>Phone number</label>
          <input value={form.phone} onChange={e => update("phone", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: LINE, background: "white" }} placeholder="10-digit mobile number" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "#5B6B67" }}>Service</label>
          <select value={form.service} onChange={e => update("service", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: LINE, background: "white" }}>
            {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: "#5B6B67" }}>Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => update("mode", "clinic")}
              className="px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2"
              style={{ borderColor: form.mode === "clinic" ? INK : LINE, background: form.mode === "clinic" ? INK : "white", color: form.mode === "clinic" ? PAPER : INK }}>
              <MapPin size={14} /> In-clinic
            </button>
            <button onClick={() => update("mode", "teletherapy")}
              className="px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2"
              style={{ borderColor: form.mode === "teletherapy" ? INK : LINE, background: form.mode === "teletherapy" ? INK : "white", color: form.mode === "teletherapy" ? PAPER : INK }}>
              <Video size={14} /> Teletherapy
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#5B6B67" }}>Preferred date</label>
            <input type="date" value={form.date} min={todayISO()} onChange={e => update("date", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: LINE, background: "white" }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#5B6B67" }}>Preferred time</label>
            <select value={form.time} onChange={e => update("time", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: LINE, background: "white" }}>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "#5B6B67" }}>Notes (optional)</label>
          <textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none resize-none" style={{ borderColor: LINE, background: "white" }}
            placeholder="Briefly describe the concern" />
        </div>

        {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "#FBE9E7", color: "#B23B2E" }}>{error}</div>}

        <button onClick={submit} disabled={saving}
          className="w-full py-3 rounded-full font-medium flex items-center justify-center gap-2 mt-2"
          style={{ background: GOLD, color: INK_DEEP, opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
          {saving ? "Submitting..." : "Request appointment"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   STATUS LOOKUP (patient side)
---------------------------------------------------------- */
function StatusLookup() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const search = async () => {
    setError(""); setResults(null);
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) { setError("Enter a valid 10-digit phone number."); return; }
    setLoading(true);
    try {
      const items = await db.getBookingsByPhone(digits);
      setResults(items.map(r => ({ ...r, meetingLink: r.meeting_link })));
    } catch (e) {
      setError("Could not fetch appointments right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = (s) => ({
    pending: { bg: "#FDF3DB", fg: "#93690F", label: "Pending confirmation" },
    confirmed: { bg: "#E1EFEA", fg: "#1E6B4E", label: "Confirmed" },
    completed: { bg: "#E7E9F5", fg: "#3B4B9B", label: "Completed" },
    cancelled: { bg: "#FBE9E7", fg: "#B23B2E", label: "Cancelled" },
  }[s] || { bg: "#EEE", fg: "#555", label: s });

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>My Appointment</div>
      <h2 className="text-2xl font-medium mb-6" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>Check your status</h2>
      <div className="flex gap-2 mb-4">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your 10-digit phone number"
          className="flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: LINE, background: "white" }} />
        <button onClick={search} className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-1" style={{ background: INK, color: PAPER }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </div>
      {error && <div className="text-sm px-3 py-2 rounded-lg mb-4" style={{ background: "#FBE9E7", color: "#B23B2E" }}>{error}</div>}

      {results && results.length === 0 && (
        <div className="text-sm text-center py-10" style={{ color: "#8A9793" }}>No appointments found for this number.</div>
      )}

      <div className="space-y-3">
        {results?.map(r => {
          const st = statusStyle(r.status);
          return (
            <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: LINE, background: PAPER_DIM }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: INK }}>
                  {SERVICES.find(s => s.key === r.service)?.label || r.service}
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
              </div>
              <div className="text-xs flex items-center gap-3" style={{ color: "#5B6B67" }}>
                <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(r.date)}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {r.time}</span>
                <span className="flex items-center gap-1">{r.mode === "teletherapy" ? <Video size={12} /> : <MapPin size={12} />} {r.mode === "teletherapy" ? "Teletherapy" : "In-clinic"}</span>
              </div>
              {r.mode === "teletherapy" && r.status === "confirmed" && r.meetingLink && (
                <a href={r.meetingLink} target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: INK, color: PAPER }}>
                  Join session <ChevronRight size={12} />
                </a>
              )}
              <div className="text-[11px] mt-2 font-mono" style={{ color: "#A8A08C" }}>Ref: {r.id}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ADMIN DASHBOARD
---------------------------------------------------------- */
function AdminGate({ onSuccess }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="max-w-xs mx-auto px-4 py-20 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: INK }}>
        <ShieldCheck size={20} color={GOLD_SOFT} />
      </div>
      <h2 className="text-xl font-medium mb-4" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>Admin access</h2>
      <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Access code"
        className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none mb-3" style={{ borderColor: LINE, background: "white" }} />
      {err && <div className="text-xs mb-3" style={{ color: "#B23B2E" }}>{err}</div>}
      <button onClick={() => code === ADMIN_CODE ? onSuccess() : setErr("Incorrect code.")}
        className="w-full py-2.5 rounded-full font-medium" style={{ background: INK, color: PAPER }}>
        Enter
      </button>
      <p className="text-[11px] mt-4" style={{ color: "#A8A08C" }}>
        Prototype-level access only — not secure authentication. Replace before real-world use.
      </p>
    </div>
  );
}

function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [linkDraft, setLinkDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await db.listBookings();
      setItems(recs.map(r => ({ ...r, meetingLink: r.meeting_link })));
    } catch (e) {
      // leave items as-is on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (rec, status) => {
    setItems(prev => prev.map(i => i.id === rec.id ? { ...i, status } : i));
    try {
      await db.updateBooking(rec.id, { status });
    } catch (e) {
      load(); // resync on failure
    }
  };

  const saveLink = async (rec) => {
    const link = linkDraft[rec.id] ?? rec.meetingLink ?? "";
    setItems(prev => prev.map(i => i.id === rec.id ? { ...i, meetingLink: link } : i));
    try {
      await db.updateBooking(rec.id, { meeting_link: link });
    } catch (e) {
      load();
    }
  };

  const filtered = items.filter(i => filter === "all" ? true : i.status === filter);
  const counts = {
    all: items.length,
    pending: items.filter(i => i.status === "pending").length,
    confirmed: items.filter(i => i.status === "confirmed").length,
    completed: items.filter(i => i.status === "completed").length,
    cancelled: items.filter(i => i.status === "cancelled").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: GOLD }}>Admin</div>
          <h2 className="text-2xl font-medium" style={{ color: INK, fontFamily: "'Fraunces', serif" }}>All appointments</h2>
        </div>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded-full font-medium border" style={{ borderColor: LINE, color: INK }}>Refresh</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "confirmed", "completed", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium capitalize"
            style={{ background: filter === f ? INK : PAPER_DIM, color: filter === f ? PAPER : INK, border: `1px solid ${LINE}` }}>
            {f} ({counts[f] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "#8A9793" }}>
          <Loader2 className="animate-spin mr-2" size={18} /> Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-center py-16" style={{ color: "#8A9793" }}>No appointments in this view yet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => (
            <div key={rec.id} className="rounded-xl border p-4" style={{ borderColor: LINE, background: "white" }}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-sm" style={{ color: INK }}>{rec.name} <span className="font-normal" style={{ color: "#8A9793" }}>· {rec.phone}</span></div>
                  <div className="text-xs mt-0.5" style={{ color: "#5B6B67" }}>
                    {SERVICES.find(s => s.key === rec.service)?.label || rec.service} · {fmtDate(rec.date)} · {rec.time} · {rec.mode === "teletherapy" ? "Teletherapy" : "In-clinic"}
                  </div>
                  {rec.notes && <div className="text-xs mt-1 italic" style={{ color: "#8A9793" }}>"{rec.notes}"</div>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => updateStatus(rec, "confirmed")} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "#E1EFEA", color: "#1E6B4E" }}>Confirm</button>
                  <button onClick={() => updateStatus(rec, "completed")} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "#E7E9F5", color: "#3B4B9B" }}>Complete</button>
                  <button onClick={() => updateStatus(rec, "cancelled")} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "#FBE9E7", color: "#B23B2E" }}>Cancel</button>
                </div>
              </div>
              {rec.mode === "teletherapy" && (
                <div className="flex gap-2 mt-3">
                  <input
                    placeholder="Paste Google Meet / Zoom link"
                    value={linkDraft[rec.id] ?? rec.meetingLink ?? ""}
                    onChange={e => setLinkDraft(d => ({ ...d, [rec.id]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: LINE }}
                  />
                  <button onClick={() => saveLink(rec)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: INK, color: PAPER }}>Save link</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Admin() {
  const [authed, setAuthed] = useState(false);
  return authed ? <AdminDashboard /> : <AdminGate onSuccess={() => setAuthed(true)} />;
}

/* ---------------------------------------------------------
   ROOT
---------------------------------------------------------- */
export default function App() {
  const [view, setView] = useState("home");
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
      `}</style>
      <Nav view={view} setView={setView} />
      {view === "home" && <Home setView={setView} />}
      {view === "book" && <BookingForm setView={setView} />}
      {view === "status" && <StatusLookup />}
      {view === "admin" && <Admin />}
    </div>
  );
}
