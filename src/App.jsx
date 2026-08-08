import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  CheckCircle2,
  Search,
  ShieldCheck,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  PhoneIncoming,
  MessageCircle,
  Menu,
  X,
  Ear,
  MessageSquareText,
  UserRound,
  HeartHandshake,
  Baby,
  Users,
  Stethoscope,
  ArrowRight,
  Star,
  Award,
  Activity,
  Headphones,
  Languages,
  Loader2,
  ExternalLink,
  Quote,
} from "lucide-react";

/* =========================================================
   BRAND
========================================================= */

const NAVY = "#0B4650";
const NAVY_DARK = "#07363D";
const TEAL = "#0E8C99";
const TEAL_DARK = "#08717C";
const AQUA = "#DDF4F3";
const AQUA_2 = "#EFF9F8";
const CREAM = "#FAFCFB";
const WHITE = "#FFFFFF";
const TEXT = "#405655";
const MUTED = "#718180";
const LINE = "#DDE9E7";
const RED = "#C74B43";
const WHATSAPP = "#25D366";
const GOLD = "#C99432";

/* =========================================================
   BUSINESS DETAILS
========================================================= */

const CLINIC_NAME = "Sona Speech & Hearing Spot";
const PHONE = "+917521949604";
const DISPLAY_PHONE = "+91 7521 949 604";

const WHATSAPP_LINK =
  "https://wa.me/917521949604?text=Hi%2C%20I%27d%20like%20to%20book%20an%20appointment%20at%20Sona%20Speech%20%26%20Hearing%20Spot";

const UPI_ID = "7521949604@ptaxis";
const UPI_NAME = "Sonam Maurya";

const UPI_LINK =
  `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&cu=INR`;

const ADMIN_CODE = "sonam2026";

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://mmqvqudjmquuobryobxw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_a0av8ALjS2ZctdGfdWsxcQ_Psk8fMny";

const db = {
  async insertBooking(record) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify([record]),
      }
    );

    if (!res.ok) {
      throw new Error(`Insert failed: ${res.status}`);
    }

    return (await res.json())[0];
  },

  async listBookings() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`List failed: ${res.status}`);
    }

    return res.json();
  },

  async getBookingsByPhone(phoneDigits) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=*&phone=eq.${phoneDigits}&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Lookup failed: ${res.status}`);
    }

    return res.json();
  },

  async updateBooking(id, patch) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(patch),
      }
    );

    if (!res.ok) {
      throw new Error(`Update failed: ${res.status}`);
    }

    return (await res.json())[0];
  },
};

/* =========================================================
   DATA
========================================================= */

const SERVICES = [
  {
    key: "speech",
    title: "Speech Therapy",
    short: "Helping children and adults communicate with greater clarity and confidence.",
    description:
      "Personalised therapy for speech delay, articulation difficulties, pronunciation, fluency and communication concerns.",
    icon: MessageSquareText,
  },
  {
    key: "audiology",
    title: "Audiology & Hearing",
    short: "Professional hearing assessment and guidance for children and adults.",
    description:
      "Hearing assessment, hearing-related guidance and personalised recommendations based on individual needs.",
    icon: Ear,
  },
  {
    key: "parent",
    title: "Parent Training",
    short: "Practical guidance to help parents support communication at home.",
    description:
      "Simple strategies parents can use every day to encourage language, interaction and communication development.",
    icon: HeartHandshake,
  },
];

const CONDITIONS = [
  {
    title: "Speech Delay & Late Talking",
    icon: Baby,
    text:
      "Support for children who are speaking later than expected or struggling to develop age-appropriate communication.",
  },
  {
    title: "Stammering",
    icon: MessageSquareText,
    text:
      "Structured fluency support for children, teenagers and adults experiencing stammering.",
  },
  {
    title: "Language Delay",
    icon: Languages,
    text:
      "Support for children who have difficulty understanding or expressing language.",
  },
  {
    title: "Hearing Loss",
    icon: Ear,
    text:
      "Assessment and guidance for children and adults experiencing hearing difficulties.",
  },
  {
    title: "Articulation Difficulties",
    icon: Activity,
    text:
      "Helping children improve unclear or difficult-to-understand speech sounds.",
  },
  {
    title: "Adult Communication",
    icon: Users,
    text:
      "Speech, fluency and communication support for adults.",
  },
];

const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
];

/* =========================================================
   HELPERS
========================================================= */

function uid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7)
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";

  return new Date(iso + "T00:00:00").toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   GLOBAL CSS
========================================================= */

function GlobalStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        background: ${CREAM};
        color: ${TEXT};
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      button,
      input,
      textarea,
      select {
        font: inherit;
      }

      button,
      a {
        -webkit-tap-highlight-color: transparent;
      }

      .soft-shadow {
        box-shadow:
          0 10px 30px rgba(11, 70, 80, 0.07);
      }

      .card-shadow {
        box-shadow:
          0 4px 18px rgba(11, 70, 80, 0.06);
      }

      .hero-pattern {
        background-image:
          radial-gradient(
            circle at 90% 10%,
            rgba(14,140,153,0.13),
            transparent 25%
          ),
          radial-gradient(
            circle at 10% 90%,
            rgba(14,140,153,0.08),
            transparent 30%
          );
      }

      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(15px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .fade-up {
        animation: fadeUp .55s ease both;
      }

      @keyframes pulseSoft {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.04);
        }
      }

      .pulse-soft {
        animation: pulseSoft 2.4s ease-in-out infinite;
      }
    `}</style>
  );
}

/* =========================================================
   LOGO
========================================================= */

function Logo({ size = 42 }) {
  const bars = [
    { x: 4, h: 8 },
    { x: 9, h: 14 },
    { x: 14, h: 20 },
    { x: 19, h: 25 },
    { x: 24, h: 20 },
    { x: 29, h: 14 },
    { x: 34, h: 8 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
    >
      <rect
        width="40"
        height="40"
        rx="12"
        fill={NAVY}
      />

      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={20 - b.h / 2}
          width="3"
          height={b.h}
          rx="1.5"
          fill={i === 3 ? WHITE : "#BFE8E9"}
        />
      ))}
    </svg>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({ view, setView }) {
  const [menu, setMenu] = useState(false);

  const navigate = (v) => {
    setView(v);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(255,255,255,.96)",
          borderColor: LINE,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-[72px] flex items-center justify-between">

            <button
              onClick={() => navigate("home")}
              className="flex items-center gap-3 text-left"
            >
              <Logo size={43} />

              <div>
                <div
                  className="font-extrabold text-[14px] sm:text-[16px]"
                  style={{ color: NAVY }}
                >
                  Sona Speech & Hearing Spot
                </div>

                <div
                  className="text-[10px] sm:text-[11px] font-medium"
                  style={{ color: MUTED }}
                >
                  Speech Therapy • Audiology • Hearing Care
                </div>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-7">
              {[
                ["home", "Home"],
                ["services", "Services"],
                ["about", "About"],
                ["faq", "FAQs"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "home") {
                      navigate("home");
                    } else {
                      setView("home");
                      setTimeout(() => {
                        document
                          .getElementById(key)
                          ?.scrollIntoView({
                            behavior: "smooth",
                          });
                      }, 50);
                    }
                  }}
                  className="text-sm font-semibold"
                  style={{
                    color:
                      view === key ? TEAL : TEXT,
                  }}
                >
                  {label}
                </button>
              ))}

              <a
                href={`tel:${PHONE}`}
                className="px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2"
                style={{
                  background: NAVY,
                  color: WHITE,
                }}
              >
                <PhoneIncoming size={15} />
                Call
              </a>

              <button
                onClick={() => navigate("book")}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: TEAL }}
              >
                Book Appointment
              </button>
            </nav>

            <button
              onClick={() => setMenu(!menu)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: AQUA_2 }}
              aria-label="Menu"
            >
              {menu ? (
                <X size={21} color={NAVY} />
              ) : (
                <Menu size={21} color={NAVY} />
              )}
            </button>
          </div>

          {menu && (
            <div
              className="md:hidden border-t py-4 space-y-2"
              style={{ borderColor: LINE }}
            >
              {[
                ["home", "Home"],
                ["services", "Services"],
                ["about", "About"],
                ["faq", "FAQs"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMenu(false);

                    if (key === "home") {
                      setView("home");
                    } else {
                      setView("home");

                      setTimeout(() => {
                        document
                          .getElementById(key)
                          ?.scrollIntoView({
                            behavior: "smooth",
                          });
                      }, 50);
                    }
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{ color: NAVY }}
                >
                  {label}
                </button>
              ))}

              <button
                onClick={() => navigate("book")}
                className="w-full py-3 rounded-xl font-bold text-white"
                style={{ background: TEAL }}
              >
                Book Appointment
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

/* =========================================================
   HERO
========================================================= */

function Hero({ setView }) {
  return (
    <section
      className="hero-pattern overflow-hidden"
      style={{ background: AQUA_2 }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-20 lg:py-24">

        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">

          <div className="fade-up">

            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{
                background: WHITE,
                color: TEAL_DARK,
                border: `1px solid ${LINE}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#2AAE72" }}
              />
              Speech & Hearing Care in Lucknow
            </div>

            <h1
              className="text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.02] font-black tracking-[-.035em]"
              style={{ color: NAVY }}
            >
              Helping you
              <br />

              <span style={{ color: TEAL }}>
                communicate
              </span>{" "}
              with confidence.
            </h1>

            <p
              className="mt-6 text-[16px] sm:text-[18px] leading-[1.75] max-w-xl"
              style={{ color: TEXT }}
            >
              Personalised speech therapy, audiology and hearing
              support for children and adults — with care designed
              around the individual, not a one-size-fits-all plan.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">

              <button
                onClick={() => setView("book")}
                className="px-6 py-3.5 rounded-full text-sm font-bold text-white flex items-center gap-2 shadow-lg"
                style={{ background: TEAL }}
              >
                Book an Appointment
                <ArrowRight size={16} />
              </button>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-full text-sm font-bold flex items-center gap-2"
                style={{
                  background: WHITE,
                  color: NAVY,
                  border: `1px solid ${LINE}`,
                }}
              >
                <MessageCircle
                  size={17}
                  color={WHATSAPP}
                />
                WhatsApp
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-xl">

              <HeroTrust icon={Award} text="RCI Registered" />
              <HeroTrust icon={Users} text="Children & Adults" />
              <HeroTrust icon={Video} text="Online Sessions" />
              <HeroTrust icon={MapPin} text="Lucknow" />

            </div>
          </div>

          <div className="relative">

            <div
              className="absolute -top-5 -right-3 w-24 h-24 rounded-full opacity-40"
              style={{ background: "#A9DDDD" }}
            />

            <div
              className="relative rounded-[32px] overflow-hidden"
              style={{
                background: WHITE,
                boxShadow:
                  "0 25px 70px rgba(11,70,80,.13)",
              }}
            >
              <div
                className="aspect-[4/4.2] flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(145deg,#DFF5F3,#FFFFFF)",
                }}
              >

                <img
                  src="/sonam-avatar.jpg"
                  alt="Sonam - Speech and Hearing Therapist"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />

                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    display: "none",
                  }}
                >
                  <UserRound
                    size={120}
                    strokeWidth={1}
                    color={TEAL}
                  />
                </div>

              </div>

              <div className="p-5 sm:p-6">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div
                      className="text-xl font-extrabold"
                      style={{ color: NAVY }}
                    >
                      Sonam
                    </div>

                    <div
                      className="text-sm mt-1"
                      style={{ color: TEXT }}
                    >
                      Speech & Hearing Therapist
                    </div>
                  </div>

                  <div
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: AQUA,
                      color: TEAL_DARK,
                    }}
                  >
                    RCI Registered
                  </div>

                </div>

                <div
                  className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t"
                  style={{ borderColor: LINE }}
                >
                  <MiniStat icon={MessageSquareText} text="Speech" />
                  <MiniStat icon={Ear} text="Hearing" />
                  <MiniStat icon={HeartHandshake} text="Family Care" />
                </div>

              </div>
            </div>

            <div
              className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
              style={{
                background: WHITE,
                border: `1px solid ${LINE}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: AQUA }}
              >
                <HeartHandshake size={18} color={TEAL} />
              </div>

              <div>
                <div
                  className="text-xs font-bold"
                  style={{ color: NAVY }}
                >
                  Personalised Care
                </div>

                <div
                  className="text-[10px]"
                  style={{ color: MUTED }}
                >
                  Every patient is different
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

function HeroTrust({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} color={TEAL} />
      <span
        className="text-[11px] sm:text-xs font-semibold"
        style={{ color: NAVY }}
      >
        {text}
      </span>
    </div>
  );
}

function MiniStat({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={17} color={TEAL} />
      <span
        className="text-[10px] font-semibold"
        style={{ color: TEXT }}
      >
        {text}
      </span>
    </div>
  );
}

/* =========================================================
   QUICK ACTIONS
========================================================= */

function QuickActions({ setView }) {
  return (
    <section
      className="relative -mt-6 sm:-mt-8 z-10"
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">

        <div
          className="rounded-2xl sm:rounded-3xl p-2 sm:p-3 grid grid-cols-2 lg:grid-cols-4 gap-2"
          style={{
            background: WHITE,
            boxShadow:
              "0 15px 45px rgba(11,70,80,.10)",
            border: `1px solid ${LINE}`,
          }}
        >

          <QuickAction
            icon={Calendar}
            title="Book Appointment"
            text="Reserve a slot"
            onClick={() => setView("book")}
          />

          <QuickAction
            icon={MessageCircle}
            title="WhatsApp Us"
            text="Talk to us"
            href={WHATSAPP_LINK}
          />

          <QuickAction
            icon={PhoneIncoming}
            title="Call Clinic"
            text={DISPLAY_PHONE}
            href={`tel:${PHONE}`}
          />

          <QuickAction
            icon={Search}
            title="My Visit"
            text="Check appointment"
            onClick={() => setView("status")}
          />

        </div>
      </div>
    </section>
  );
}

function
