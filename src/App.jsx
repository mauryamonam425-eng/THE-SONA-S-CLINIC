import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, MapPin, Video, CheckCircle2, Search, ShieldCheck,
  ChevronRight, Loader2, Ear, MessageSquareText, Copy, Check, ChevronDown,
  Home, Stethoscope, PhoneCall, Building2, Menu, PhoneIncoming, Package, MessageCircle
} from "lucide-react";

/* ---------------------------------------------------------
   DESIGN TOKENS — Gleneagles-inspired clinical palette
   White base, deep teal headings, bright teal accents,
   soft blue-gray section backgrounds, red for urgent CTA.
---------------------------------------------------------- */
const NAVY = "#0E4A54";       // deep teal-navy for headings
const TEAL = "#0F8B99";       // primary accent / buttons
const TEAL_DARK = "#0B6E7A";
const BG_WHITE = "#FFFFFF";
const BG_SOFT = "#EAF3F3";    // light blue-teal section tint
const BG_SOFT2 = "#F4F7F6";
const TEXT_GRAY = "#4B5A59";
const LINE = "#DCE7E6";
const RED = "#C1443A";
const WHATSAPP = "#25D366";
const WHATSAPP_LINK = "https://wa.me/917521949604?text=Hi%2C%20I%27d%20like%20to%20book%20an%20appointment%20at%20Sona%20Speech%20%26%20Hearing%20Spot";

const SUPABASE_URL = "https://mmqvqudjmquuobryobxw.supabase.co";
const SUPABASE_KEY = "sb_publishable_a0av8ALjS2ZctdGfdWsxcQ_Psk8fMny";

const db = {
  async insertBooking(record) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify([record]),
    });
    if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
    return (await res.json())[0];
  },
  async listBookings() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    return res.json();
  },
  async getBookingsByPhone(phoneDigits) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&phone=eq.${phoneDigits}&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
    return res.json();
  },
  async updateBooking(id, patch) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    return (await res.json())[0];
  },
};

const SERVICES = [
  { key: "speech", label: "Speech & Language Therapy", icon: MessageSquareText },
  { key: "audiology", label: "Audiology & Hearing Assessment", icon: Ear },
  { key: "parent", label: "Parent Training", icon: CheckCircle2 },
];
const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];
const ADMIN_CODE = "sonam2026";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/* ---------------------------------------------------------
   LOGO — a compact soundwave emblem: navy rounded badge with
   a symmetric white waveform, echoing "voice" as the clinic's
   visual identity. Pure SVG, no image file needed.
---------------------------------------------------------- */
function Logo({ size = 36 }) {
  const bars = [
    { x: 4, h: 8 },
    { x: 9, h: 14 },
    { x: 14, h: 20 },
    { x: 19, h: 24 },
    { x: 24, h: 20 },
    { x: 29, h: 14 },
    { x: 34, h: 8 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="11" fill={NAVY} />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={20 - b.h / 2} width="3" height={b.h} rx="1.5" fill={i === 3 ? "#FFFFFF" : "#BFE3E6"} />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------
   Sticky top bar: logo row + location row (Gleneagles style)
---------------------------------------------------------- */
function TopBars() {
  return (
    <div className="sticky top-0 z-30">
      <div className="border-b" style={{ background: BG_WHITE, borderColor: LINE }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Menu size={20} color={NAVY} />
            <Logo size={34} />
            <span className="font-bold text-base leading-tight tracking-tight" style={{ color: NAVY }}>Sona Speech &amp; Hearing Spot</span>
          </div>
          <div className="flex items-center gap-4">
            <Search size={18} color={NAVY} />
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: WHATSAPP }}>
              <MessageCircle size={16} color="white" />
            </a>
            <a href="tel:+917521949604" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: RED }}>
              <PhoneIncoming size={15} color="white" />
            </a>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-2.5 border-b" style={{ background: BG_SOFT2, borderColor: LINE }}>
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: NAVY }}>
          <MapPin size={15} color={TEAL} />
          Lucknow
        </div>
        <ChevronDown size={16} color={TEXT_GRAY} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Bottom fixed icon nav (mirrors hospital app bottom bar)
---------------------------------------------------------- */
function BottomNav({ view, setView }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "book", label: "Book", icon: Calendar, primary: true },
    { key: "status", label: "My Visit", icon: PhoneCall },
    { key: "admin", label: "Admin", icon: Building2 },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t" style={{ background: BG_WHITE, borderColor: LINE, boxShadow: "0 -2px 8px rgba(0,0,0,0.04)" }}>
      <div className="max-w-3xl mx-auto flex items-end justify-around py-3">
        {items.map(it => {
          const Icon = it.icon;
          const active = view === it.key;
          if (it.primary) {
            return (
              <button key={it.key} onClick={() => setView(it.key)} className="flex flex-col items-center -mt-7">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4" style={{ background: TEAL, borderColor: BG_WHITE }}>
                  <Icon size={24} color="white" />
                </div>
                <span className="text-[11px] mt-1.5 font-semibold" style={{ color: TEAL }}>{it.label}</span>
              </button>
            );
          }
          return (
            <button key={it.key} onClick={() => setView(it.key)} className="flex flex-col items-center gap-1.5 px-3 py-1.5">
              <Icon size={21} color={active ? TEAL : "#9CA8A7"} />
              <span className="text-[11px] font-medium" style={{ color: active ? TEAL : "#9CA8A7" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HOME
---------------------------------------------------------- */
function Home_({ setView }) {
  return (
    <div className="pb-28">
      {/* Hero */}
      <section className="px-5 pt-14 pb-14" style={{ background: BG_SOFT }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: TEAL }}>Speech Therapist &amp; Audiologist in Lucknow</div>
          <h1 className="text-4xl font-extrabold leading-[1.15] mb-5 max-w-md" style={{ color: NAVY }}>
            Every voice deserves to be understood.
          </h1>
          <p className="text-[15px] leading-relaxed mb-8 max-w-md" style={{ color: TEXT_GRAY }}>
            Sonam is an RCI registered speech therapist and audiologist treating speech delay,
            stammering, language delay, and hearing loss in children and adults — in-clinic in
            Lucknow, or through online speech therapy from anywhere in India.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setView("book")} className="px-6 py-3.5 rounded-full font-semibold text-sm text-white" style={{ background: TEAL }}>
              Book an Appointment
            </button>
            <button onClick={() => setView("status")} className="px-6 py-3.5 rounded-full font-semibold text-sm border" style={{ borderColor: TEAL, color: TEAL }}>
              Check my visit
            </button>
            <a href="tel:+917521949604" className="px-6 py-3.5 rounded-full font-semibold text-sm border flex items-center gap-2" style={{ borderColor: RED, color: RED }}>
              <PhoneIncoming size={14} /> Call
            </a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="px-6 py-3.5 rounded-full font-semibold text-sm text-white flex items-center gap-2" style={{ background: WHATSAPP }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Achievements-style block */}
      <section className="px-5 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-5 tracking-tight" style={{ color: NAVY }}>About the Clinic</h2>
          <p className="text-[15px] leading-[1.8] max-w-xl" style={{ color: TEXT_GRAY }}>
            Sona Speech &amp; Hearing Spot is a trusted <strong>speech therapy and audiology clinic
            in Lucknow</strong>, led by an RCI registered speech therapist. We work with children
            who are late talkers or have speech delay, adults and children who stammer, and
            patients of all ages needing a hearing test or hearing aid — with every case tracked
            against clear, measurable progress.
          </p>
        </div>
      </section>

      {/* Track record / Achievements style */}
      <section className="px-5 py-14" style={{ background: BG_SOFT }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-5 tracking-tight" style={{ color: NAVY }}>Why Families Choose Sonam</h2>
          <p className="text-[15px] leading-[1.8] mb-8 max-w-xl" style={{ color: TEXT_GRAY }}>
            Every case Sonam takes on is followed closely, session by session, with clear milestones —
            not vague reassurance. Families consistently see fast, visible progress because therapy is
            personalised from day one and adjusted the moment something isn't working.
          </p>
          <div className="space-y-5">
            <TrackItem text="Every case is assessed individually — no generic therapy plans." />
            <TrackItem text="Progress is tracked and shared with parents at every stage, not just at the end." />
            <TrackItem text="Therapy plans are adjusted quickly the moment progress slows." />
            <TrackItem text="A strong, consistent track record of children and adults advancing faster than typical timelines." />
          </div>
        </div>
      </section>

      {/* Conditions Treated style */}
      <section className="px-5 py-14" style={{ background: BG_SOFT2 }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-3 tracking-tight" style={{ color: NAVY }}>Conditions Treated</h2>
          <p className="text-[15px] leading-relaxed mb-8 max-w-xl" style={{ color: TEXT_GRAY }}>
            We manage a wide range of hearing, speech, language, and swallowing disorders.
          </p>
          <div className="space-y-6">
            <ConditionItem title="Hearing Loss & Hearing Aid Fitting" text="A condition affecting anyone from babies to adults — diagnosed with a hearing test and managed with hearing aids or referral for cochlear implants." />
            <ConditionItem title="Speech Delay & Late Talkers" text="For children not talking on time — personalised therapy to build age-appropriate speech and language skills." />
            <ConditionItem title="Stammering Treatment (Fluency Disorder)" text="Early diagnosis and structured therapy to build fluent, confident speech in children and adults." />
            <ConditionItem title="Language Delay in Toddlers" text="For children struggling to understand or use language appropriate to their age — including support for children on the autism spectrum." />
          </div>
        </div>
      </section>

      {/* Doctor / Clinician card, Gleneagles-style */}
      <section className="px-5 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-6 tracking-tight" style={{ color: NAVY }}>Our Clinician</h2>
          <div className="rounded-2xl border p-7" style={{ borderColor: LINE, background: BG_WHITE, boxShadow: "0 4px 16px rgba(14,74,84,0.06)" }}>
            <div className="flex gap-5">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0" style={{ background: NAVY }}>
                <Logo size={56} />
              </div>
              <div className="flex-1 pt-1">
                <div className="font-bold text-xl" style={{ color: NAVY }}>Sonam</div>
                <div className="text-sm mt-0.5" style={{ color: TEXT_GRAY }}>Clinical Director</div>
                <div className="text-sm font-semibold mt-1.5" style={{ color: TEAL_DARK }}>RCI Registered SLP</div>
              </div>
            </div>
            <div className="h-px my-6" style={{ background: LINE }} />
            <div className="flex items-center gap-2 text-sm mb-2.5" style={{ color: TEXT_GRAY }}>
              <MapPin size={15} color={TEAL} /> Lucknow, Uttar Pradesh
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_GRAY }}>
              <PhoneIncoming size={15} color={RED} /> +91 7521 949 604
            </div>
            <div className="flex gap-3 mt-7">
              <a href="tel:+917521949604" className="px-4 py-3 rounded-full text-sm font-semibold border flex items-center justify-center" style={{ borderColor: RED, color: RED }}>
                Call
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="px-4 py-3 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: WHATSAPP }}>
                <MessageCircle size={15} /> WhatsApp
              </a>
              <button onClick={() => setView("book")} className="flex-1 px-4 py-3 rounded-full text-sm font-semibold text-white" style={{ background: TEAL }}>
                Book
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-xs px-5" style={{ color: "#9CA8A7" }}>
        Sona Speech &amp; Hearing Spot · Lucknow, Uttar Pradesh · +91 7521 949 604
      </footer>
    </div>
  );
}

function TrackItem({ text }) {
  return (
    <div className="flex gap-3.5 items-start">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: BG_SOFT2 }}>
        <CheckCircle2 size={14} color={TEAL} />
      </div>
      <p className="text-[15px] leading-relaxed" style={{ color: TEXT_GRAY }}>{text}</p>
    </div>
  );
}

function ConditionItem({ title, text }) {
  return (
    <div className="flex gap-3.5">
      <div className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TEAL }} />
      <p className="text-[15px] leading-relaxed" style={{ color: TEXT_GRAY }}>
        <span className="font-semibold" style={{ color: NAVY }}>{title}: </span>{text}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------
   BOOKING FLOW
---------------------------------------------------------- */
function BookingForm({ setView }) {
  const [form, setForm] = useState({ name: "", phone: "", service: SERVICES[0].key, mode: "clinic", date: todayISO(), time: TIME_SLOTS[0], notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refId, setRefId] = useState(null);
  const [copied, setCopied] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) { setError("Please enter your name and phone number."); return; }
    const digits = form.phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) { setError("Please enter a valid 10-digit phone number."); return; }
    setSaving(true);
    const id = uid();
    try {
      await db.insertBooking({ id, name: form.name, phone: digits, service: form.service, mode: form.mode, date: form.date, time: form.time, notes: form.notes, status: "pending", meeting_link: "" });
      setRefId(id);
    } catch (e) {
      setError("Could not save your booking. Please try again.");
    } finally { setSaving(false); }
  };

  const copyRef = () => { navigator.clipboard?.writeText(refId); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  if (refId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center pb-24">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: BG_SOFT }}>
          <CheckCircle2 size={26} color={TEAL} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: NAVY }}>Request received</h2>
        <p className="text-sm mb-6" style={{ color: TEXT_GRAY }}>
          We'll confirm your {form.mode === "teletherapy" ? "teletherapy" : "in-clinic"} slot on {fmtDate(form.date)} at {form.time}.
        </p>
        <div className="rounded-xl p-4 flex items-center justify-between mb-6 border" style={{ background: BG_SOFT2, borderColor: LINE }}>
          <span className="font-mono text-sm" style={{ color: NAVY }}>{refId}</span>
          <button onClick={copyRef} className="flex items-center gap-1 text-xs font-semibold" style={{ color: TEAL }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button onClick={() => setView("status")} className="px-5 py-2.5 rounded-full font-semibold text-white" style={{ background: TEAL }}>
          Check appointment status
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-28">
      <h2 className="text-2xl font-extrabold mb-6" style={{ color: NAVY }}>Request an Appointment</h2>
      <div className="space-y-4">
        <Field label="Full name">
          <input value={form.name} onChange={e => update("name", e.target.value)} className={inputCls} placeholder="Patient or parent's name" />
        </Field>
        <Field label="Phone number">
          <input value={form.phone} onChange={e => update("phone", e.target.value)} className={inputCls} placeholder="10-digit mobile number" />
        </Field>
        <Field label="Service">
          <select value={form.service} onChange={e => update("service", e.target.value)} className={inputCls}>
            {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Mode">
          <div className="grid grid-cols-2 gap-2">
            {[{ k: "clinic", label: "In-clinic", Icon: MapPin }, { k: "teletherapy", label: "Teletherapy", Icon: Video }].map(({ k, label, Icon }) => (
              <button key={k} onClick={() => update("mode", k)} className="px-4 py-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2"
                style={{ borderColor: form.mode === k ? TEAL : LINE, background: form.mode === k ? TEAL : "white", color: form.mode === k ? "white" : NAVY }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preferred date">
            <input type="date" value={form.date} min={todayISO()} onChange={e => update("date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Preferred time">
            <select value={form.time} onChange={e => update("time", e.target.value)} className={inputCls}>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Briefly describe the concern" />
        </Field>
        {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "#FBE9E7", color: RED }}>{error}</div>}
        <button onClick={submit} disabled={saving} className="w-full py-3 rounded-full font-semibold text-white flex items-center justify-center gap-2 mt-2" style={{ background: TEAL, opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />} {saving ? "Submitting..." : "Request appointment"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none bg-white";
function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1" style={{ color: TEXT_GRAY }}>{label}</label>
      <div style={{ "--tw-border-opacity": 1 }}>
        {React.cloneElement(children, { style: { borderColor: LINE, ...children.props.style } })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   STATUS LOOKUP
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
    } catch (e) { setError("Could not fetch appointments right now."); } finally { setLoading(false); }
  };

  const statusStyle = (s) => ({
    pending: { bg: "#FDF3DB", fg: "#93690F", label: "Pending confirmation" },
    confirmed: { bg: BG_SOFT, fg: TEAL_DARK, label: "Confirmed" },
    completed: { bg: "#E7E9F5", fg: "#3B4B9B", label: "Completed" },
    cancelled: { bg: "#FBE9E7", fg: RED, label: "Cancelled" },
  }[s] || { bg: "#EEE", fg: "#555", label: s });

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-28">
      <h2 className="text-2xl font-extrabold mb-6" style={{ color: NAVY }}>Check Your Visit</h2>
      <div className="flex gap-2 mb-4">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your 10-digit phone number" className={inputCls} style={{ borderColor: LINE }} />
        <button onClick={search} className="px-4 py-2.5 rounded-lg font-semibold text-white flex items-center gap-1" style={{ background: TEAL }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </div>
      {error && <div className="text-sm px-3 py-2 rounded-lg mb-4" style={{ background: "#FBE9E7", color: RED }}>{error}</div>}
      {results && results.length === 0 && <div className="text-sm text-center py-10" style={{ color: "#9CA8A7" }}>No appointments found for this number.</div>}
      <div className="space-y-3">
        {results?.map(r => {
          const st = statusStyle(r.status);
          return (
            <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: LINE, background: BG_SOFT2 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: NAVY }}>{SERVICES.find(s => s.key === r.service)?.label || r.service}</span>
                <span className="text-[11px] px-2 py-1 rounded-full font-semibold" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
              </div>
              <div className="text-xs flex items-center gap-3" style={{ color: TEXT_GRAY }}>
                <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(r.date)}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {r.time}</span>
                <span className="flex items-center gap-1">{r.mode === "teletherapy" ? <Video size={12} /> : <MapPin size={12} />} {r.mode === "teletherapy" ? "Teletherapy" : "In-clinic"}</span>
              </div>
              {r.mode === "teletherapy" && r.status === "confirmed" && r.meetingLink && (
                <a href={r.meetingLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: TEAL }}>
                  Join session <ChevronRight size={12} />
                </a>
              )}
              <div className="text-[11px] mt-2 font-mono" style={{ color: "#B7C1C0" }}>Ref: {r.id}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ADMIN
---------------------------------------------------------- */
function AdminGate({ onSuccess }) {
  const [code, setCode] = useState(""); const [err, setErr] = useState("");
  return (
    <div className="max-w-xs mx-auto px-4 py-20 text-center pb-28">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: BG_SOFT }}>
        <ShieldCheck size={20} color={TEAL} />
      </div>
      <h2 className="text-xl font-extrabold mb-4" style={{ color: NAVY }}>Admin Access</h2>
      <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Access code" className={inputCls} style={{ borderColor: LINE }} />
      {err && <div className="text-xs mt-2 mb-1" style={{ color: RED }}>{err}</div>}
      <button onClick={() => code === ADMIN_CODE ? onSuccess() : setErr("Incorrect code.")} className="w-full py-2.5 rounded-full font-semibold text-white mt-3" style={{ background: TEAL }}>Enter</button>
      <p className="text-[11px] mt-4" style={{ color: "#9CA8A7" }}>Prototype-level access only — replace before real-world use.</p>
    </div>
  );
}

function AdminDashboard() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); const [linkDraft, setLinkDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await db.listBookings();
      setItems(recs.map(r => ({ ...r, meetingLink: r.meeting_link })));
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (rec, status) => {
    setItems(prev => prev.map(i => i.id === rec.id ? { ...i, status } : i));
    try { await db.updateBooking(rec.id, { status }); } catch (e) { load(); }
  };
  const saveLink = async (rec) => {
    const link = linkDraft[rec.id] ?? rec.meetingLink ?? "";
    setItems(prev => prev.map(i => i.id === rec.id ? { ...i, meetingLink: link } : i));
    try { await db.updateBooking(rec.id, { meeting_link: link }); } catch (e) { load(); }
  };

  const filtered = items.filter(i => filter === "all" ? true : i.status === filter);
  const counts = { all: items.length, pending: items.filter(i => i.status === "pending").length, confirmed: items.filter(i => i.status === "confirmed").length, completed: items.filter(i => i.status === "completed").length, cancelled: items.filter(i => i.status === "cancelled").length };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold" style={{ color: NAVY }}>All Appointments</h2>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded-full font-semibold border" style={{ borderColor: LINE, color: NAVY }}>Refresh</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "confirmed", "completed", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize border"
            style={{ background: filter === f ? TEAL : BG_SOFT2, color: filter === f ? "white" : NAVY, borderColor: LINE }}>
            {f} ({counts[f] ?? 0})
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "#9CA8A7" }}><Loader2 className="animate-spin mr-2" size={18} /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-center py-16" style={{ color: "#9CA8A7" }}>No appointments in this view yet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => (
            <div key={rec.id} className="rounded-xl border p-4" style={{ borderColor: LINE, background: "white" }}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>{rec.name} <span className="font-normal" style={{ color: "#9CA8A7" }}>· {rec.phone}</span></div>
                  <div className="text-xs mt-0.5" style={{ color: TEXT_GRAY }}>
                    {SERVICES.find(s => s.key === rec.service)?.label || rec.service} · {fmtDate(rec.date)} · {rec.time} · {rec.mode === "teletherapy" ? "Teletherapy" : "In-clinic"}
                  </div>
                  {rec.notes && <div className="text-xs mt-1 italic" style={{ color: "#9CA8A7" }}>"{rec.notes}"</div>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => updateStatus(rec, "confirmed")} className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: BG_SOFT, color: TEAL_DARK }}>Confirm</button>
                  <button onClick={() => updateStatus(rec, "completed")} className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: "#E7E9F5", color: "#3B4B9B" }}>Complete</button>
                  <button onClick={() => updateStatus(rec, "cancelled")} className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: "#FBE9E7", color: RED }}>Cancel</button>
                </div>
              </div>
              {rec.mode === "teletherapy" && (
                <div className="flex gap-2 mt-3">
                  <input placeholder="Paste Google Meet / Zoom link" value={linkDraft[rec.id] ?? rec.meetingLink ?? ""} onChange={e => setLinkDraft(d => ({ ...d, [rec.id]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: LINE }} />
                  <button onClick={() => saveLink(rec)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: TEAL }}>Save link</button>
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
    <div className="min-h-screen" style={{ background: BG_WHITE, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopBars />
      {view === "home" && <Home_ setView={setView} />}
      {view === "book" && <BookingForm setView={setView} />}
      {view === "status" && <StatusLookup />}
      {view === "admin" && <Admin />}
      <BottomNav view={view} setView={setView} />
    </div>
  );
}
