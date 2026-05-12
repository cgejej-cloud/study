"use client";

import { useState } from "react";

const COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-lime-100 text-lime-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-rose-100 text-rose-700",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export default function Avatar({
  name,
  size = "md",
  className = "",
  avatar,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  avatar?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();
  const color = COLORS[hash(name) % COLORS.length];
  const sizeCls = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  }[size];

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeCls} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeCls} ${color} rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
