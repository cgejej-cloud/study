"use client";

import { useState } from "react";

const COLORS = [
  "bg-red-100",
  "bg-orange-100",
  "bg-amber-100",
  "bg-lime-100",
  "bg-green-100",
  "bg-teal-100",
  "bg-cyan-100",
  "bg-blue-100",
  "bg-indigo-100",
  "bg-purple-100",
  "bg-pink-100",
  "bg-rose-100",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "rgba(0,0,0,0.75)" : "#fff";
}

function isEmoji(s: string) {
  return s.length <= 4 && !s.startsWith("http");
}

export default function Avatar({
  name,
  size = "md",
  className = "",
  avatar,
  profileColor,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  avatar?: string | null;
  profileColor?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const sizeCls = {
    xs: "w-6 h-6 text-[14px]",
    sm: "w-8 h-8 text-[18px]",
    md: "w-10 h-10 text-[22px]",
    lg: "w-16 h-16 text-[36px]",
  }[size];

  // 이미지 URL 아바타
  if (avatar && !imgError && !isEmoji(avatar)) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeCls} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  // 이모지 아바타
  if (avatar && isEmoji(avatar)) {
    const bg = profileColor || null;
    return (
      <div
        className={`${sizeCls} rounded-full flex items-center justify-center shrink-0 ${className} ${!bg ? COLORS[hash(name) % COLORS.length] : ""}`}
        style={bg ? { background: bg } : {}}
        aria-hidden="true"
      >
        {avatar}
      </div>
    );
  }

  // 단색 배경 (텍스트 없음)
  if (profileColor) {
    return (
      <div
        className={`${sizeCls} rounded-full shrink-0 ${className}`}
        style={{ background: profileColor }}
        aria-hidden="true"
      />
    );
  }

  // 기본: 이름 기반 색상 (텍스트 없음)
  const color = COLORS[hash(name) % COLORS.length];
  return (
    <div
      className={`${sizeCls} ${color} rounded-full shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
