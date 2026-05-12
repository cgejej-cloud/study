"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function EditProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotify, setEmailNotify] = useState(true);
  const [avatar, setAvatar] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 계정 삭제 모달
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data) { router.push("/login"); return; }
        setName(data.name || "");
        setPhone(data.phone || "");
        setAvatar(data.avatar || "");
        // emailNotify는 세션 토큰에 없을 수 있어 사용자 조회 별도 호출 가능하나 기본 true
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        emailNotify,
        avatar: avatar || null,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    });

    setLoading(false);
    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "수정 실패" });
      return;
    }

    toast.show("정보가 수정되었습니다.", "success");
    setMessage({ type: "success", text: "정보가 수정되었습니다." });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleDelete() {
    if (!deletePassword) {
      toast.show("비밀번호를 입력해주세요.", "error");
      return;
    }
    setDeleting(true);
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    setDeleting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.show(data.error || "탈퇴 처리에 실패했습니다.", "error");
      return;
    }
    toast.show("탈퇴 처리가 완료되었습니다.", "success");
    setTimeout(() => { window.location.href = "/"; }, 800);
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600" aria-label="마이페이지로 돌아가기">←</Link>
        <h1 className="text-2xl font-bold">내 정보 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={30}
            autoComplete="name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">연락처</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            autoComplete="tel"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">프로필 사진</label>
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt="아바타" className="w-16 h-16 rounded-full object-cover border border-gray-200 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl shrink-0">
                {name?.[0] ?? "?"}
              </div>
            )}
            <div className="flex-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                <span>📷</span>
                <span>{avatarUploading ? "업로드 중..." : "사진 변경"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={avatarUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarUploading(true);
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/me/avatar", { method: "POST", body: fd });
                    const data = await res.json();
                    setAvatarUploading(false);
                    if (res.ok) {
                      setAvatar(data.url);
                      toast.show("프로필 사진이 변경되었습니다.", "success");
                    } else {
                      toast.show(data.error || "업로드 실패", "error");
                    }
                  }}
                />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · 최대 2MB</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">이메일 알림</p>
            <p className="text-xs text-gray-400 mt-0.5">예약 확정 · 경기 기록 알림 받기</p>
          </div>
          <button
            type="button"
            onClick={() => setEmailNotify(v => !v)}
            role="switch"
            aria-checked={emailNotify}
            className={`w-11 h-6 rounded-full transition-colors relative ${emailNotify ? "bg-green-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotify ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        <hr />

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">현재 비밀번호</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="비밀번호 변경 시 입력"
            autoComplete="current-password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">새 비밀번호</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="변경할 경우에만 입력 (8자 이상)"
            autoComplete="new-password"
            minLength={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">새 비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 재입력"
            autoComplete="new-password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {message.type === "success" ? "✅ " : "⚠️ "}{message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-600 disabled:opacity-40"
        >
          {loading ? "처리 중..." : "저장"}
        </button>
      </form>

      {/* 위험 구역 */}
      <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-bold text-red-600 mb-1">위험 구역</h2>
        <p className="text-xs text-gray-500 mb-3">계정 탈퇴 시 미래 예약은 취소되고, 경기 기록은 익명으로 보존됩니다.</p>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="text-sm border border-red-200 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          회원 탈퇴
        </button>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" role="dialog">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900">회원 탈퇴 확인</h3>
            <p className="text-sm text-gray-500">
              정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              본인 확인을 위해 비밀번호를 입력해주세요.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDelete(false); setDeletePassword(""); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-600 disabled:opacity-40"
              >
                {deleting ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
