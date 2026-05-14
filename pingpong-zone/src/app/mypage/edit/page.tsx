"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { PROFILE_COLORS } from "@/lib/validation";

const ANIMAL_EMOJIS = [
  "🐱","🐶","🐼","🐨","🦊","🐻","🐯","🦁",
  "🐸","🐧","🦆","🐰","🐹","🐺","🦝","🦋",
  "🐳","🦈","🐬","🦜","🦩","🦚","🦉","🐦",
  "🐙","🦑","🦀","🐡","🐠","🐟","🦭","🐻‍❄️",
];

export default function EditProfilePage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotify, setEmailNotify] = useState(true);
  const [racketType, setRacketType] = useState("");
  const [playStyle, setPlayStyle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [profileColor, setProfileColor] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "account" | "password" | "danger">("profile");
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data) { router.push("/login"); return; }
        setName(data.name || "");
        setNickname(data.nickname || "");
        setBio(data.bio || "");
        setPhone(data.phone || "");
        setAvatar(data.avatar || "");
        setProfileColor(data.profileColor || "");
        setRacketType(data.racketType || "");
        setPlayStyle(data.playStyle || "");
        if (typeof data.emailNotify === "boolean") setEmailNotify(data.emailNotify);
      });
  }, [router]);

  const displayName = nickname.trim() || name.trim() || "?";

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        nickname: nickname || null,
        bio: bio || null,
        profileColor: profileColor || null,
        phone,
        emailNotify,
        avatar: avatar || null,
        racketType: racketType || null,
        playStyle: playStyle || null,
      }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) { toast.show(data.error || "저장 실패", "error"); return; }
    toast.show("프로필이 저장되었습니다.", "success");
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.show("새 비밀번호가 일치하지 않습니다.", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currentPassword, newPassword }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) { toast.show(data.error || "비밀번호 변경 실패", "error"); return; }
    toast.show("비밀번호가 변경되었습니다.", "success");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  }

  async function handleDelete() {
    if (!deletePassword) { toast.show("비밀번호를 입력해주세요.", "error"); return; }
    setDeleting(true);
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    setDeleting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.show(data.error || "탈퇴 처리에 실패했습니다.", "error"); return; }
    toast.show("탈퇴 처리가 완료되었습니다.", "success");
    setTimeout(() => { window.location.href = "/"; }, 800);
  }

  const tabs = [
    { key: "profile" as const, label: "프로필" },
    { key: "account" as const, label: "계정" },
    { key: "password" as const, label: "비밀번호" },
    { key: "danger" as const, label: "탈퇴" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/mypage" style={{ color: "var(--text-3)", fontSize: "18px" }}>←</Link>
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em" }}>내 정보 수정</h1>
      </div>

      {/* 프로필 미리보기 */}
      <div className="card p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, var(--jade-50), var(--jade-100))" }}>
        <Avatar name={displayName} size="lg" avatar={avatar || undefined} profileColor={profileColor || undefined} />
        <div className="min-w-0">
          <p className="font-extrabold text-[18px]" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            {displayName}
          </p>
          {nickname && (
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>실명: {name}</p>
          )}
          {bio && (
            <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--text-2)" }}>{bio}</p>
          )}
        </div>
      </div>

      {/* 섹션 탭 */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--jade-50)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
            style={activeSection === t.key
              ? { background: t.key === "danger" ? "#dc2626" : "var(--jade-950)", color: "#fff" }
              : { color: t.key === "danger" ? "#dc2626" : "var(--text-2)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 프로필 섹션 ── */}
      {activeSection === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* 기본 정보 */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                닉네임 <span className="text-[11px] font-normal" style={{ color: "var(--text-3)" }}>(공개 표시 이름, 선택)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="ex) 탁구왕, 서브마스터 …"
                className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
                style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                닉네임을 설정하면 랭킹·프로필·팔로우에서 닉네임으로 표시됩니다.
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                실명 <span className="text-[11px] font-normal" style={{ color: "var(--text-3)" }}>(2~30자, 내부 관리용)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={30}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
                style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                한 줄 소개{" "}
                <span className="text-[11px] font-normal" style={{ color: bio.length > 120 ? "#e11d48" : "var(--text-3)" }}>
                  {bio.length}/140
                </span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={140}
                rows={2}
                placeholder="ex) 백핸드 특화 공격형 플레이어 🏓"
                className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none resize-none"
                style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
              />
            </div>
          </div>

          {/* 동물 아바타 */}
          <div className="card p-5">
            <label className="block text-[13px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>
              아바타 동물 선택
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              <button
                type="button"
                onClick={() => setAvatar("")}
                className="aspect-square rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                style={{
                  background: avatar === "" ? "var(--jade-950)" : "var(--jade-50)",
                  color: avatar === "" ? "#fff" : "var(--text-3)",
                  border: avatar === "" ? "2px solid var(--jade-950)" : "2px solid var(--border)",
                }}
              >
                없음
              </button>
              {ANIMAL_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className="aspect-square rounded-full flex items-center justify-center text-[22px] transition-all"
                  style={{
                    background: avatar === emoji ? "var(--jade-100)" : "var(--jade-50)",
                    border: avatar === emoji ? "2px solid var(--jade-700)" : "2px solid transparent",
                    outline: avatar === emoji ? "2px solid var(--jade-300)" : "none",
                    outlineOffset: "1px",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 배경 색상 */}
          <div className="card p-5">
            <label className="block text-[13px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>
              아바타 배경 색상
            </label>
            <div className="grid grid-cols-8 gap-2">
              <button
                type="button"
                onClick={() => setProfileColor("")}
                className="aspect-square rounded-full transition-all flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
                  border: profileColor === "" ? "3px solid var(--jade-700)" : "3px solid transparent",
                  outline: profileColor === "" ? "2px solid var(--jade-300)" : "none",
                }}
              >
                <span className="text-[10px] font-bold" style={{ color: "#64748b" }}>자동</span>
              </button>
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProfileColor(c)}
                  className="aspect-square rounded-full transition-all"
                  style={{
                    background: c,
                    border: profileColor === c ? "3px solid #1e293b" : "3px solid transparent",
                    outline: profileColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* 탁구 정보 */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>라켓 타입</label>
              <select
                value={racketType}
                onChange={(e) => setRacketType(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
                style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
              >
                <option value="">선택 안 함</option>
                <option value="shake">셰이크핸드</option>
                <option value="pen_cn">중국식 펜홀더</option>
                <option value="pen_jp">일본식 펜홀더</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>플레이 전형</label>
              <select
                value={playStyle}
                onChange={(e) => setPlayStyle(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
                style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
              >
                <option value="">선택 안 함</option>
                <option value="all_round">올라운더</option>
                <option value="drive">드라이브형</option>
                <option value="loop">루프형</option>
                <option value="smash">스매시형</option>
                <option value="speed">속공형</option>
                <option value="cut">커트형 (수비)</option>
                <option value="serve">서브·리시브형</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-jade w-full py-3 font-bold text-[14px]"
          >
            {saving ? "저장 중…" : "프로필 저장"}
          </button>
        </form>
      )}

      {/* ── 계정 섹션 ── */}
      {activeSection === "account" && (
        <form onSubmit={handleSaveProfile} className="card p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>연락처</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              autoComplete="tel"
              className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
            />
          </div>
          <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid var(--border)" }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>이메일 알림</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>예약 확정·경기 기록 알림 수신</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailNotify((v) => !v)}
              role="switch"
              aria-checked={emailNotify}
              className="w-11 h-6 rounded-full transition-colors relative shrink-0"
              style={{ background: emailNotify ? "var(--jade-600)" : "var(--border)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: emailNotify ? "translateX(20px)" : "translateX(2px)" }}
              />
            </button>
          </div>
          <button type="submit" disabled={saving} className="btn btn-jade w-full py-3 font-bold text-[14px]">
            {saving ? "저장 중…" : "계정 정보 저장"}
          </button>
        </form>
      )}

      {/* ── 비밀번호 섹션 ── */}
      {activeSection === "password" && (
        <form onSubmit={handleSavePassword} className="card p-5 space-y-4">
          {[
            { label: "현재 비밀번호", value: currentPassword, set: setCurrentPassword, placeholder: "현재 비밀번호", autoComplete: "current-password" },
            { label: "새 비밀번호", value: newPassword, set: setNewPassword, placeholder: "8자 이상", autoComplete: "new-password" },
            { label: "새 비밀번호 확인", value: confirmPassword, set: setConfirmPassword, placeholder: "재입력", autoComplete: "new-password" },
          ].map(({ label, value, set, placeholder, autoComplete }) => (
            <div key={label}>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
                style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
              />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn btn-jade w-full py-3 font-bold text-[14px]">
            {saving ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      )}

      {/* ── 탈퇴 섹션 ── */}
      {activeSection === "danger" && (
        <div className="card p-5 space-y-3" style={{ border: "1px solid #fecaca" }}>
          <h2 className="font-bold text-[14px]" style={{ color: "#dc2626" }}>회원 탈퇴</h2>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
            탈퇴 시 미래 예약은 자동 취소되고, 경기 기록은 익명으로 보존됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="btn w-full py-3 font-bold text-[14px]"
            style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            회원 탈퇴하기
          </button>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <h3 className="font-extrabold text-[16px]" style={{ color: "var(--text-1)" }}>회원 탈퇴 확인</h3>
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
              정말 탈퇴하시겠습니까? 본인 확인을 위해 비밀번호를 입력해주세요.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-xl px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ background: "var(--jade-50)", border: "1.5px solid var(--border)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowDelete(false); setDeletePassword(""); }} className="btn flex-1 py-2.5 font-semibold">취소</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl font-bold text-[13px]"
                style={{ background: "#dc2626", color: "#fff", opacity: deleting ? 0.5 : 1 }}
              >
                {deleting ? "처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
