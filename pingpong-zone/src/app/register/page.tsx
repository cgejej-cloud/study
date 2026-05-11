"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    const v = email.trim().toLowerCase();
    if (!v) { setEmailStatus("idle"); return; }
    setEmailStatus("checking");
    const t = setTimeout(() => {
      fetch(`/api/check-email?email=${encodeURIComponent(v)}`)
        .then((r) => r.ok ? r.json() : { taken: null })
        .then((d) => {
          if (d.valid === false) setEmailStatus("invalid");
          else if (d.taken === true) setEmailStatus("taken");
          else if (d.taken === false) setEmailStatus("available");
          else setEmailStatus("idle");
        })
        .catch(() => setEmailStatus("idle"));
    }, 500);
    return () => clearTimeout(t);
  }, [email]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (emailStatus === "taken") {
      setError("이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        phone: form.get("phone"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "회원가입 실패");
      return;
    }
    router.push("/login");
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block text-3xl font-extrabold text-green-700 tracking-tight">
          🏓 탁구존
        </Link>
        <p className="text-gray-500 text-sm mt-1">새 계정을 만드세요</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">회원가입</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "name",     label: "이름",    type: "text",     required: true,  placeholder: "홍길동",          autoComplete: "name",         hint: "" },
            { name: "email",    label: "이메일",  type: "email",    required: true,  placeholder: "email@example.com", autoComplete: "email",        hint: "" },
            { name: "password", label: "비밀번호", type: "password", required: true,  placeholder: "••••••••",       autoComplete: "new-password", hint: "8자 이상 입력해주세요" },
            { name: "phone",    label: "전화번호", type: "tel",      required: false, placeholder: "010-0000-0000",  autoComplete: "tel",          hint: "선택 사항입니다" },
          ].map((field) => {
            const isEmail = field.name === "email";
            return (
              <div key={field.name}>
                <label htmlFor={`reg-${field.name}`} className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
                </label>
                <input
                  id={`reg-${field.name}`}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  minLength={field.name === "password" ? 8 : undefined}
                  value={isEmail ? email : undefined}
                  onChange={isEmail ? (e) => setEmail(e.target.value) : undefined}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isEmail && emailStatus === "taken"    ? "border-red-300" :
                    isEmail && emailStatus === "available" ? "border-green-300" :
                    "border-gray-300"
                  }`}
                />
                {isEmail && emailStatus === "checking" && (
                  <p className="text-xs text-gray-400 mt-1">확인 중...</p>
                )}
                {isEmail && emailStatus === "available" && (
                  <p className="text-xs text-green-600 mt-1">✓ 사용 가능한 이메일입니다</p>
                )}
                {isEmail && emailStatus === "taken" && (
                  <p className="text-xs text-red-500 mt-1">이미 사용 중인 이메일입니다</p>
                )}
                {isEmail && emailStatus === "invalid" && (
                  <p className="text-xs text-amber-600 mt-1">올바른 이메일 형식이 아닙니다</p>
                )}
                {!isEmail && field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
              </div>
            );
          })}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-green-700 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
