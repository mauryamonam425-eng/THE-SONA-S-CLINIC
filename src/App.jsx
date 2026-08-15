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
const GOLD_STAR = "#F5A623";
const CORAL_ACCENT = "#F2946B";
const WHATSAPP_LINK = "https://wa.me/919236007124?text=Hi%2C%20I%27d%20like%20to%20book%20an%20appointment%20at%20Sona%20Speech%20%26%20Hearing%20Spot";
const UPI_ID = "7521949604@ptaxis";
const UPI_NAME = "Sonam Maurya";
const UPI_LINK = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&cu=INR`;

// EmailJS sends an email to Sonam/admin whenever a new booking comes in.
// Fill these in after signing up at emailjs.com (see GO_LIVE_GUIDE section
// for step-by-step setup). Until filled in, this quietly does nothing —
// bookings still save normally either way.
const EMAILJS_SERVICE_ID = "";   // e.g. "service_abc1234"
const EMAILJS_TEMPLATE_ID = "";  // e.g. "template_xyz5678"
const EMAILJS_PUBLIC_KEY = "";   // e.g. "AbCdEfGhIjKlMnOp"
const ADMIN_ALERT_EMAIL = "";    // e.g. "sonaspeechhearingspot@gmail.com"

async function sendAdminAlertEmail(record) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !ADMIN_ALERT_EMAIL) return;
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: ADMIN_ALERT_EMAIL,
          patient_name: record.name,
          patient_phone: record.phone,
          service: record.service,
          mode: record.mode,
          date: record.date,
          time: record.time,
          notes: record.notes || "(none)",
        },
      }),
    });
  } catch (e) {
    // Never block a booking just because the email alert failed to send.
  }
}

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
  // Admin-only: enforced server-side by the passcode inside the database
  // function itself — the app never carries a client-side secret anymore.
  async listBookings(passcode) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_list_bookings`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_passcode: passcode }),
    });
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    return res.json();
  },
  // Patients can only fetch bookings matching the exact phone number they
  // enter — this function returns nothing else, unlike a raw table query.
  async getBookingsByPhone(phoneDigits) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/lookup_bookings_by_phone`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_phone: phoneDigits }),
    });
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
    return res.json();
  },
  async updateBooking(passcode, id, patch) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_booking`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_passcode: passcode,
        p_id: id,
        p_status: patch.status ?? null,
        p_meeting_link: patch.meeting_link ?? null,
      }),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },
};

const SERVICES = [
  { key: "speech", label: "Speech & Language Therapy", icon: MessageSquareText },
  { key: "audiology", label: "Audiology & Hearing Assessment", icon: Ear },
  { key: "parent", label: "Parent Training", icon: CheckCircle2 },
];
const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];
// Note: the admin passcode is no longer stored here — it lives only inside
// the Supabase database function, so it can never be found by viewing this
// app's code. See create_bookings_table_security.sql for where to change it.

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// Builds a WhatsApp link to the patient with a message matching the
// booking's current status — one tap for Sonam to notify them, no
// paid messaging service needed.
function notifyPatientLink(rec) {
  const svc = SERVICES.find(s => s.key === rec.service)?.label || rec.service;
  const when = `${fmtDate(rec.date)} at ${rec.time}`;
  let msg;
  if (rec.status === "confirmed") {
    msg = `Hi ${rec.name}, this is Sona Speech & Hearing Spot. Your ${svc} appointment on ${when} is confirmed${rec.mode === "teletherapy" && rec.meetingLink ? `. Join here when it's time: ${rec.meetingLink}` : "."}`;
  } else if (rec.status === "completed") {
    msg = `Hi ${rec.name}, thank you for visiting Sona Speech & Hearing Spot today. Let us know if you have any questions before your next session.`;
  } else if (rec.status === "cancelled") {
    msg = `Hi ${rec.name}, your appointment on ${when} has been cancelled. Please reach out to reschedule whenever convenient.`;
  } else {
    msg = `Hi ${rec.name}, this is Sona Speech & Hearing Spot regarding your appointment request for ${when}.`;
  }
  return `https://wa.me/${rec.phone.length === 10 ? "91" + rec.phone : rec.phone}?text=${encodeURIComponent(msg)}`;
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
      <div style={{ background: NAVY }}>
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full pl-2 pr-4 py-1.5" style={{ background: BG_WHITE }}>
            <Logo size={30} />
            <span className="font-bold text-[13px] leading-tight tracking-tight" style={{ color: NAVY }}>Sona Speech &amp; Hearing Spot</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: WHATSAPP }}>
              <MessageCircle size={16} color="white" />
            </a>
            <a href="tel:+919236007124" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: RED }}>
              <PhoneIncoming size={15} color="white" />
            </a>
          </div>
        </div>
      </div>
      <div className="flex items-center px-5 py-2.5 border-b" style={{ background: BG_SOFT2, borderColor: LINE }}>
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: NAVY }}>
          <MapPin size={15} color={TEAL} />
          Lucknow, Uttar Pradesh
        </div>
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
/* ---------------------------------------------------------
   Rotating hero headline carousel — auto-advances, with
   manual arrows, echoing the reference site's hero pattern.
---------------------------------------------------------- */
const HERO_HEADLINES = [
  "Better Hearing. Better Communication. Better Life.",
  "Every voice deserves to be understood.",
  "Real progress, tracked every step of the way.",
];

const QUICK_SERVICES = [
  { label: "Hearing Assessment", icon: Ear },
  { label: "Hearing Aid Consultation", icon: Ear },
  { label: "Speech Therapy", icon: MessageSquareText },
  { label: "Stammering Therapy", icon: MessageSquareText },
  { label: "Pediatric Speech Therapy", icon: CheckCircle2 },
  { label: "Language Delay Support", icon: CheckCircle2 },
];

/* ---------------------------------------------------------
   Subtle decorative waveform in the hero background — adds
   visual richness without needing photography or illustration.
---------------------------------------------------------- */
function HeroBackdrop() {
  const bars = Array.from({ length: 26 }, (_, i) => {
    const wave = Math.sin(i * 0.5) * 0.5 + 0.5;
    return 16 + wave * 44;
  });
  const barColors = [TEAL, CORAL_ACCENT, TEAL_DARK];
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Soft color blobs for depth */}
      <div className="absolute -left-14 -top-14 w-52 h-52 rounded-full" style={{ background: TEAL, opacity: 0.10 }} />
      <div className="absolute -right-10 top-8 w-32 h-32 rounded-full" style={{ background: CORAL_ACCENT, opacity: 0.08 }} />

      {/* Animated, colorful equalizer strip along the bottom edge —
          lively, on-brand (sound/voice), and safely clear of the text
          above thanks to the section's extra bottom padding. */}
      <div className="absolute left-0 right-0 bottom-0 flex items-end justify-center gap-[3px]" style={{ height: 56, paddingBottom: 8 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: h,
              background: barColors[i % barColors.length],
              borderRadius: 3,
              opacity: 0.5,
              animation: `eqPulse 1.4s ease-in-out ${(i % 7) * 0.09}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes eqPulse {
          0%, 100% { transform: scaleY(0.55); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function HeroHeadlineCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % HERO_HEADLINES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const go = (dir) => setIndex(i => (i + dir + HERO_HEADLINES.length) % HERO_HEADLINES.length);

  return (
    <div className="mb-5 max-w-md">
      <h1
        key={index}
        className="text-4xl font-extrabold leading-[1.15]"
        style={{ color: NAVY, animation: "heroFade 0.5s ease" }}
      >
        {HERO_HEADLINES[index]}
      </h1>
      <style>{`@keyframes heroFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={() => go(-1)} aria-label="Previous headline" className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ borderColor: LINE }}>
          <ChevronRight size={14} color={TEAL} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div className="flex gap-1.5">
          {HERO_HEADLINES.map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: i === index ? 16 : 6, height: 6, background: i === index ? TEAL : LINE, transition: "width 0.2s" }} />
          ))}
        </div>
        <button onClick={() => go(1)} aria-label="Next headline" className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ borderColor: LINE }}>
          <ChevronRight size={14} color={TEAL} />
        </button>
      </div>
    </div>
  );
}

function Home_({ setView }) {
  return (
    <div className="pb-28">
      {/* Hero */}
      <section className="px-5 pt-14 pb-24 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${BG_SOFT} 0%, #E4F1F1 55%, ${BG_SOFT2} 100%)` }}>
        <HeroBackdrop />
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: TEAL }}>Speech Therapist &amp; Audiologist in Lucknow</div>
          <HeroHeadlineCarousel />
          <p className="text-[15px] leading-relaxed mb-8 max-w-md" style={{ color: TEXT_GRAY }}>
            Comprehensive hearing, speech and audiology care with personalised solutions for children and adults — in-clinic in Lucknow, or online from anywhere in India.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setView("book")} className="px-6 py-3.5 rounded-full font-semibold text-sm text-white" style={{ background: TEAL }}>
              Book an Appointment
            </button>
            <a href="tel:+919236007124" className="px-6 py-3.5 rounded-full font-semibold text-sm border flex items-center gap-2" style={{ borderColor: RED, color: RED }}>
              <PhoneIncoming size={14} /> Call Now
            </a>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {QUICK_SERVICES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold" style={{ background: BG_WHITE, color: NAVY, border: `1px solid ${LINE}` }}>
                <Icon size={13} color={TEAL} /> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements-style block */}
      <section className="px-5 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-5 tracking-tight" style={{ color: NAVY }}>About the Clinic</h2>
          <p className="text-[15px] leading-[1.8] max-w-xl mb-5" style={{ color: TEXT_GRAY }}>
            Sona Speech &amp; Hearing Spot is a trusted <strong>speech therapy and audiology clinic
            in Lucknow</strong>, led by an RCI registered speech therapist. We work with children
            who are late talkers or have speech delay, adults and children who stammer, and
            patients of all ages needing a hearing test or hearing aid.
          </p>
          <p className="text-[15px] leading-[1.8] max-w-xl" style={{ color: TEXT_GRAY }}>
            No case is treated with a generic plan. Every patient is assessed individually,
            given a clear starting point, and followed with measurable progress at every stage —
            so families always know exactly where things stand, not just what was done in a session.
          </p>
        </div>
      </section>

      {/* Why Patients Choose Us — trust section */}
      <section className="px-5 py-14" style={{ background: BG_SOFT }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-8 tracking-tight" style={{ color: NAVY }}>Why Patients Choose Us</h2>
          <div className="space-y-6">
            <TrustPoint title="Qualified Speech Therapist & Audiologist" text="RCI registered, with professional assessment and personalised treatment for every case." />
            <TrustPoint title="Personalised Hearing & Speech Solutions" text="Recommendations based on individual needs and lifestyle — never a generic, one-size-fits-all plan." />
            <TrustPoint title="Real, Tracked Progress" text="Every case is followed closely with clear milestones, so you always know where things stand." />
            <TrustPoint title="In-Clinic & Online Care" text="Visit in Lucknow, or connect through online speech therapy scheduled around your routine." />
          </div>
        </div>
      </section>

      {/* Testimonials — real Google reviews. Placed right after the trust
          claims above, so proof follows the promise immediately. */}
      <section className="px-5 py-14" style={{ background: BG_SOFT }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[26px] font-extrabold tracking-tight" style={{ color: NAVY }}>What Parents Say</h2>
          </div>
          <div className="flex items-center gap-1.5 mb-8">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} width="15" height="15" viewBox="0 0 20 20" fill={GOLD_STAR}>
                  <path d="M10 1l2.6 5.9L19 7.6l-4.6 4.4 1.2 6.5L10 15.6l-5.6 2.9 1.2-6.5L1 7.6l6.4-.7z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-semibold ml-1" style={{ color: TEXT_GRAY }}>Real reviews from Google</span>
          </div>
          <div className="space-y-4">
            <TestimonialCard
              name="Arushi"
              text="I am extremely grateful to Sonam Mam for her dedication and support in helping my son overcome his speech delay. When we started therapy about a year ago, my son was not speaking at all. With regular therapy, patience, and guidance from Sonam Mam, he has shown tremendous improvement and started communicating and speaking. Sonam Mam is very caring, patient, and professional, and her efforts have made a big difference in our son's development."
            />
            <TestimonialCard
              name="Artika Agarwal"
              text="I am taking therapy of my child from Sonam ma'am from the past 1 year and there is a very positive improvement in my child. He is 6 years old, and after starting therapy he is gradually improving and has also started saying some words."
            />
            <TestimonialCard
              name="Harpreet Kapoor"
              text="Our experience with Sona Mam, speech therapist, has been going very well. Her behaviour is extremely patient, supportive, and affectionate toward the child. She plans every session according to the child's needs, and we've seen clear progress in a short time. She also guides parents properly. I recommend her with full confidence for any child needing speech or language support."
            />
            <TestimonialCard
              name="Shashank Kashyap"
              text="Best speech therapist in the area, so happy with the results and my child's progress."
            />
          </div>
        </div>
      </section>

      {/* Conditions Treated style */}
      <section className="px-5 py-14" style={{ background: BG_SOFT2 }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: TEAL }}>Our Services</div>
          <h2 className="text-[26px] font-extrabold mb-3 tracking-tight" style={{ color: NAVY }}>What We Treat</h2>
          <p className="text-[15px] leading-relaxed mb-8 max-w-xl" style={{ color: TEXT_GRAY }}>
            Speech therapy and audiology care for a wide range of hearing, speech, language, and swallowing needs — tap any condition below for details.
          </p>
          <div className="space-y-3">
            <ServiceDropdown title="Hearing Loss & Hearing Aid Fitting" text="A condition affecting anyone from babies to adults — diagnosed with a hearing test and managed with hearing aids or referral for cochlear implants." />
            <ServiceDropdown title="Speech Delay & Late Talkers" text="For children not talking on time — personalised therapy to build age-appropriate speech and language skills." />
            <ServiceDropdown title="Stammering Treatment (Fluency Disorder)" text="Early diagnosis and structured therapy to build fluent, confident speech in children and adults." />
            <ServiceDropdown title="Language Delay in Toddlers" text="For children struggling to understand or use language appropriate to their age — including support for children on the autism spectrum." />
          </div>
        </div>
      </section>

      {/* Mid-page CTA banner — extra conversion point on long pages */}
      <section className="px-5 py-10" style={{ background: NAVY }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-lg font-bold mb-4 text-white">Have a concern? Don't wait it out.</div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => setView("book")} className="px-6 py-3 rounded-full font-semibold text-sm" style={{ background: TEAL, color: "white" }}>
              Book an Appointment
            </button>
            <a href="tel:+919236007124" className="px-6 py-3 rounded-full font-semibold text-sm border border-white text-white flex items-center gap-2">
              <PhoneIncoming size={14} /> Call Now
            </a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2" style={{ background: WHATSAPP, color: "white" }}>
              <MessageCircle size={14} /> WhatsApp Now
            </a>
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
                <div className="text-sm mt-0.5" style={{ color: TEXT_GRAY }}>Experienced Speech &amp; Hearing Therapist</div>
                <div className="text-sm font-semibold mt-1.5" style={{ color: TEAL_DARK }}>RCI Registered SLP</div>
              </div>
            </div>
            <div className="h-px my-6" style={{ background: LINE }} />
            <div className="flex items-center gap-2 text-sm mb-2.5" style={{ color: TEXT_GRAY }}>
              <MapPin size={15} color={TEAL} /> H.N. D-2/456, Sec. 1, LDA Colony, Kanpur Road, Lucknow – 226012
            </div>
            <div className="flex items-center gap-2 text-sm mb-2.5" style={{ color: TEXT_GRAY }}>
              <Clock size={15} color={TEAL} /> Open 9:00 AM – 7:00 PM &middot; Online sessions scheduled around your timing
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_GRAY }}>
              <PhoneIncoming size={15} color={RED} /> +91 9236 007 124
            </div>
            <div className="flex gap-3 mt-7">
              <a href="tel:+919236007124" className="px-4 py-3 rounded-full text-sm font-semibold border flex items-center justify-center" style={{ borderColor: RED, color: RED }}>
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

      {/* FAQ */}
      <section className="px-5 py-14" style={{ background: BG_SOFT2 }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[26px] font-extrabold mb-6 tracking-tight" style={{ color: NAVY }}>Frequently Asked Questions</h2>
          <div className="space-y-3">
            <FAQItem q="Do you treat adults, or only children?" a="Both. We work with children on speech delay, language delay, and articulation, as well as adults on stammering, voice issues, and hearing loss." />
            <FAQItem q="How many sessions will be needed?" a="This depends entirely on the individual case. After the first assessment, Sonam gives a clear, honest estimate — not a generic number — and adjusts the plan as real progress is tracked." />
            <FAQItem q="Do I need to book an appointment in advance?" a="Yes, please book ahead (via the Book button, call, or WhatsApp) so a slot can be reserved — walk-ins may need to wait if the clinic is full." />
            <FAQItem q="What is the consultation fee?" a="Fee details are shared directly when you call or WhatsApp us — just tap the call or WhatsApp button and we'll answer any cost questions right away." />
            <FAQItem q="Do you offer online / video sessions?" a="Yes. Teletherapy is available for patients anywhere in India, and timing is scheduled flexibly around your own routine." />
            <FAQItem q="Which hearing tests are available?" a="Please call or WhatsApp to check current audiology testing availability — this depends on the type of test needed." />
          </div>
        </div>
      </section>

      {/* Final contact section — a real closing moment, not just a caption */}
      <section className="px-5 py-14" style={{ background: NAVY }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: CORAL_ACCENT }}>Get in Touch</div>
          <h2 className="text-2xl font-extrabold mb-6 text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Ready when you are.
          </h2>
          <div className="text-sm mb-2" style={{ color: "#CBD9D6" }}>
            H.N. D-2/456, Sec. 1, LDA Colony, Kanpur Road, Lucknow – 226012
          </div>
          <div className="text-sm mb-8" style={{ color: "#CBD9D6" }}>
            Open 9:00 AM – 7:00 PM &middot; Online sessions scheduled around your timing
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => setView("book")} className="px-6 py-3 rounded-full font-semibold text-sm" style={{ background: TEAL, color: "white" }}>
              Book an Appointment
            </button>
            <a href="tel:+919236007124" className="px-6 py-3 rounded-full font-semibold text-sm border border-white text-white flex items-center gap-2">
              <PhoneIncoming size={14} /> Call Now
            </a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2" style={{ background: WHATSAPP, color: "white" }}>
              <MessageCircle size={14} /> WhatsApp Now
            </a>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-xs px-5" style={{ color: "#9CA8A7" }}>
        Sona Speech &amp; Hearing Spot · Lucknow, Uttar Pradesh · +91 9236 007 124
      </footer>
    </div>
  );
}

function TestimonialCard({ name, text }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: LINE, background: BG_WHITE, boxShadow: "0 2px 10px rgba(14,74,84,0.05)" }}>
      <div className="flex gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map(i => (
          <svg key={i} width="13" height="13" viewBox="0 0 20 20" fill={GOLD_STAR}>
            <path d="M10 1l2.6 5.9L19 7.6l-4.6 4.4 1.2 6.5L10 15.6l-5.6 2.9 1.2-6.5L1 7.6l6.4-.7z" />
          </svg>
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-5" style={{ color: TEXT_GRAY, fontStyle: "italic" }}>
        "{text}"
      </p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: TEAL }}>
          {initial}
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: NAVY }}>{name}</div>
          <div className="text-xs" style={{ color: "#9CA8A7" }}>Google Review</div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: LINE, background: BG_WHITE }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="text-sm font-semibold" style={{ color: NAVY }}>{q}</span>
        <ChevronDown size={18} color={TEAL} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: TEXT_GRAY }}>
          {a}
        </div>
      )}
    </div>
  );
}

function TrustPoint({ title, text }) {
  return (
    <div className="flex gap-3.5 items-start">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: TEAL }}>
        <Check size={15} color="white" strokeWidth={3} />
      </div>
      <div>
        <div className="text-[15px] font-bold mb-1" style={{ color: NAVY }}>{title}</div>
        <p className="text-sm leading-relaxed" style={{ color: TEXT_GRAY }}>{text}</p>
      </div>
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

function ServiceDropdown({ title, text, link }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: LINE, background: BG_WHITE }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TEAL }} />
          <span className="text-[15px] font-semibold" style={{ color: NAVY }}>{title}</span>
        </span>
        <ChevronDown size={18} color={TEAL} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && (
        <div className="px-5 pb-4 pl-[34px]">
          <p className="text-[14px] leading-relaxed mb-2" style={{ color: TEXT_GRAY }}>{text}</p>
          {link && (
            <a href={link} className="text-sm font-semibold" style={{ color: TEAL }}>
              Learn more &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   BOOKING FLOW
---------------------------------------------------------- */
function BookingForm({ setView }) {
  const [form, setForm] = useState({ name: "", phone: "", service: SERVICES[0].key, mode: "clinic", date: todayISO(), time: TIME_SLOTS[0], notes: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refId, setRefId] = useState(null);
  const [copied, setCopied] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    // Honeypot: a hidden field real visitors never see or fill in.
    // If it has anything in it, the submission came from a bot — silently drop it.
    if (form.website) { setRefId(uid()); return; }
    if (!form.name.trim() || !form.phone.trim()) { setError("Please enter your name and phone number."); return; }
    const digits = form.phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) { setError("Please enter a valid 10-digit phone number."); return; }
    setSaving(true);
    const id = uid();
    const newRecord = { id, name: form.name, phone: digits, service: form.service, mode: form.mode, date: form.date, time: form.time, notes: form.notes, status: "pending", meeting_link: "" };
    try {
      await db.insertBooking(newRecord);
      setRefId(id);
      sendAdminAlertEmail(newRecord); // fire-and-forget, never blocks the booking
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

        {/* UPI payment — only shown here, after a booking is actually made */}
        <div className="rounded-xl p-5 mb-6 border text-left" style={{ background: BG_SOFT, borderColor: LINE }}>
          <div className="text-sm font-bold mb-1.5" style={{ color: NAVY }}>Want to pay in advance?</div>
          <p className="text-xs leading-relaxed mb-4" style={{ color: TEXT_GRAY }}>
            Optional — once your fee is confirmed over call or WhatsApp, you can pay via UPI here anytime.
          </p>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: TEAL }}>UPI ID</div>
          <div className="text-sm font-bold mb-4" style={{ color: NAVY }}>{UPI_ID}</div>
          <a
            href={UPI_LINK}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white"
            style={{ background: TEAL }}
          >
            Pay via UPI App
          </a>
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
        {/* Honeypot — invisible to real visitors, only a bot would fill this in */}
        <input
          type="text"
          value={form.website}
          onChange={e => update("website", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
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
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [checking, setChecking] = useState(false);

  const tryEnter = async () => {
    setErr(""); setChecking(true);
    try {
      // The passcode is checked inside the database function itself —
      // it never lives in this app's code, so there's nothing to find
      // by inspecting the site.
      await db.listBookings(code);
      onSuccess(code);
    } catch (e) {
      setErr("Incorrect code.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-xs mx-auto px-4 py-20 text-center pb-28">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: BG_SOFT }}>
        <ShieldCheck size={20} color={TEAL} />
      </div>
      <h2 className="text-xl font-extrabold mb-4" style={{ color: NAVY }}>Admin Access</h2>
      <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Access code" className={inputCls} style={{ borderColor: LINE }} />
      {err && <div className="text-xs mt-2 mb-1" style={{ color: RED }}>{err}</div>}
      <button onClick={tryEnter} disabled={checking} className="w-full py-2.5 rounded-full font-semibold text-white mt-3" style={{ background: TEAL, opacity: checking ? 0.7 : 1 }}>
        {checking ? "Checking..." : "Enter"}
      </button>
    </div>
  );
}

function AdminDashboard({ passcode }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); const [linkDraft, setLinkDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await db.listBookings(passcode);
      setItems(recs.map(r => ({ ...r, meetingLink: r.meeting_link })));
    } catch (e) {} finally { setLoading(false); }
  }, [passcode]);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (rec, status) => {
    setItems(prev => prev.map(i => i.id === rec.id ? { ...i, status } : i));
    try { await db.updateBooking(passcode, rec.id, { status }); } catch (e) { load(); }
  };
  const saveLink = async (rec) => {
    const link = linkDraft[rec.id] ?? rec.meetingLink ?? "";
    setItems(prev => prev.map(i => i.id === rec.id ? { ...i, meetingLink: link } : i));
    try { await db.updateBooking(passcode, rec.id, { meeting_link: link }); } catch (e) { load(); }
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
                  <a href={notifyPatientLink(rec)} target="_blank" rel="noreferrer" className="text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1" style={{ background: WHATSAPP, color: "white" }}>
                    <MessageCircle size={11} /> Notify Patient
                  </a>
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
  const [passcode, setPasscode] = useState(null);
  return passcode ? <AdminDashboard passcode={passcode} /> : <AdminGate onSuccess={setPasscode} />;
}

/* ---------------------------------------------------------
   ROOT
---------------------------------------------------------- */
/* ---------------------------------------------------------
   Floating action buttons — WhatsApp always reachable, and a
   scroll-to-top button that appears once you've scrolled down.
   Positioned to clear the fixed bottom nav bar.
---------------------------------------------------------- */
function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed right-4 z-40 flex flex-col gap-3 items-end" style={{ bottom: 96 }}>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border"
          style={{ background: BG_WHITE, borderColor: LINE }}
        >
          <ChevronRight size={18} color={NAVY} style={{ transform: "rotate(-90deg)" }} />
        </button>
      )}
      <a
        href={WHATSAPP_LINK} target="_blank" rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: WHATSAPP }}
      >
        <MessageCircle size={24} color="white" />
      </a>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");

  useEffect(() => {
    // Admin is reached only via a secret web address, never a public button.
    // Visiting sonaspeechhearingspot.in/#sona-staff opens it.
    const checkHash = () => {
      if (window.location.hash === "#sona-staff") setView("admin");
      if (window.location.hash === "#book") setView("book");
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  useEffect(() => {
    // Gently fade + rise each section into view as the visitor scrolls,
    // instead of everything appearing at once. Marks every <section> as
    // a reveal target automatically — no need to tag them individually.
    document.querySelectorAll("section").forEach(el => el.classList.add("reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll("section.reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [view]);

  return (
    <div className="min-h-screen" style={{ background: BG_WHITE }}>
      <TopBars />
      {view === "home" && <Home_ setView={setView} />}
      {view === "book" && <BookingForm setView={setView} />}
      {view === "status" && <StatusLookup />}
      {view === "admin" && <Admin />}
      <FloatingButtons />
      <BottomNav view={view} setView={setView} />
    </div>
  );
}
