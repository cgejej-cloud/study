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

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none transition-shadow";

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-6">
        <Link href="/" className="inline-block font-extrabold text-[26px]" style={{ color: "var(--jade-950)", letterSpacing: "-0.03em" }}>
          🏓 탁구존
        </Link>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>새 계정을 만드세요</p>
      </div>

      <div className="card p-7">
        <h1 className="font-extrabold text-[18px] mb-5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>회원가입</h1>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {[
            { name: "name",     label: "이름",    type: "text",     required: true,  placeholder: "홍길동",            autoComplete: "name",         hint: "" },
            { name: "email",    label: "이메일",  type: "email",    required: true,  placeholder: "email@example.com", autoComplete: "email",        hint: "" },
            { name: "password", label: "비밀번호", type: "password", required: true,  placeholder: "••••••••",          autoComplete: "new-password", hint: "8자 이상 입력해주세요" },
            { name: "phone",    label: "전화번호", type: "tel",      required: false, placeholder: "010-0000-0000",     autoComplete: "tel",          hint: "선택 사항입니다" },
          ].map((field) => {
            const isEmail = field.name === "email";
            const borderColor = isEmail && emailStatus === "taken" ? "#fca5a5"
              : isEmail && emailStatus === "available" ? "var(--jade-400)"
              : "var(--border)";
            return (
              <div key={field.name}>
                <label htmlFor={`reg-${field.name}`} className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
                  {field.label}
                  {field.required && <span className="ml-1" style={{ color: "#f43f5e" }} aria-hidden="true">*</span>}
                </label>
                <input
                  id={`reg-${field.name}`} name={field.name} type={field.type}
                  required={field.required} placeholder={field.placeholder} autoComplete={field.autoComplete}
                  minLength={field.name === "password" ? 8 : undefined}
                  value={isEmail ? email : undefined}
                  onChange={isEmail ? (e) => setEmail(e.target.value) : undefined}
                  className={inputCls}
                  style={{ border: `1.5px solid ${borderColor}`, background: "white" }}
                />
                {isEmail && emailStatus === "checking"  && <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>확인 중...</p>}
                {isEmail && emailStatus === "available" && <p className="text-[11px] mt-1" style={{ color: "var(--jade-600)" }}>✓ 사용 가능한 이메일입니다</p>}
                {isEmail && emailStatus === "taken"     && <p className="text-[11px] mt-1" style={{ color: "#e11d48" }}>이미 사용 중인 이메일입니다</p>}
                {isEmail && emailStatus === "invalid"   && <p className="text-[11px] mt-1" style={{ color: "#d97706" }}>올바른 이메일 형식이 아닙니다</p>}
                {!isEmail && field.hint && <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{field.hint}</p>}
              </div>
            );
          })}

          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-[12px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-all mt-1"
            style={{ background: "var(--jade-950)", color: "white", opacity: loading ? 0.6 : 1 }}>
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-[12px] mt-5" style={{ color: "var(--text-3)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
