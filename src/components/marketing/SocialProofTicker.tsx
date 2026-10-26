"use client";

import { useEffect, useRef, useState } from "react";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Twitter", "Telegram", "Spotify", "Discord", "Twitch"];
const SERVICES  = ["takipçi", "beğeni", "izlenme", "abone", "yorum", "repost"];
const LOCATIONS = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "TR", "DE", "NL"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEntry() {
  const qty = [100, 250, 500, 1000, 2500][Math.floor(Math.random() * 5)];
  return {
    id: Math.random(),
    platform: randomFrom(PLATFORMS),
    service: randomFrom(SERVICES),
    location: randomFrom(LOCATIONS),
    qty,
    ts: new Date(),
  };
}

type Entry = ReturnType<typeof generateEntry>;

export function SocialProofTicker() {
  const [current, setCurrent] = useState<Entry | null>(null);
  const [show, setShow] = useState(false);
  const queueRef = useRef<Entry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNext() {
    const next = queueRef.current.shift();
    if (!next) {
      timerRef.current = setTimeout(() => {
        queueRef.current = Array.from({ length: 5 }, generateEntry);
        showNext();
      }, 120_000);
      return;
    }

    setCurrent(next);
    setShow(true);

    timerRef.current = setTimeout(() => {
      setShow(false);
      const delay = 20_000 + Math.random() * 20_000;
      timerRef.current = setTimeout(showNext, delay);
    }, 4_000);
  }

  useEffect(() => {
    // İlk görüntülemeden 8 sn sonra başlat
    const seed = setTimeout(() => {
      // başlangıç kuyruğu
      queueRef.current = Array.from({ length: 8 }, generateEntry);
      showNext();
    }, 8000);

    // Her 45 saniyede yeni sipariş bilgisi ekle
    const generator = setInterval(() => {
      queueRef.current.push(generateEntry());
    }, 45_000);

    return () => {
      clearTimeout(seed);
      clearInterval(generator);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // showNext only reads refs and stable setters; this effect intentionally runs once.
   
  }, []);

  if (!current) return null;

  return (
    <div
      className={`fixed bottom-28 left-3 right-3 z-[7000] max-w-sm transition-all duration-500 sm:bottom-20 sm:left-4 sm:right-auto ${
        show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1f3c]/90 px-4 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
          {current.platform === "Instagram" ? "📸" :
           current.platform === "TikTok" ? "🎵" :
           current.platform === "YouTube" ? "📺" :
           current.platform === "Twitter" ? "🐦" :
           current.platform === "Telegram" ? "✈️" :
           current.platform === "Spotify" ? "🎧" :
           current.platform === "Discord" ? "💬" : "🎮"}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white leading-tight">
            {current.location} — {current.qty.toLocaleString("tr-TR")} {current.platform} {current.service}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Az önce sipariş verildi ✓</p>
        </div>
      </div>
    </div>
  );
}
