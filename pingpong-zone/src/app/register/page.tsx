"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ConsentKey = "age" | "terms" | "privacy" | "marketing";

const CONSENT_LABELS: Record<ConsentKey, { label: string; required: boolean; link?: { href: string; text: string } }> = {
  age:       { label: "만 14세 이상입니다", required: true },
  terms:     { label: "이용약관에 동의합니다", required: true, link: { href: "/terms",   text: "약관 보기" } },
  privacy:   { label: "개인정보 수집·이용에 동의합니다", required: true, link: { href: "/privacy", text: "처리방침 보기" } },
  marketing: { label: "이벤트 · 알림 메일 수신에 동의합니다", required: false, link: { href: "/privacy#marketing", text: "수신 내용" } },
};

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  const [consent, setConsent] = useState<Record<ConsentKey, boolean>>({
    age: false, terms: false, privacy: false, marketing: false,
  });

  const allRequired = consent.age && consent.terms && consent.privacy;
  const allChecked  = allRequired && consent.marketing;

  function toggleAll(value: boolean) {
    setConsent({ age: value, terms: value, privacy: value, marketing: value });
  }
  function toggleOne(key: ConsentKey) {
    setConsent((c) => ({ ...c, [key]: !c[key] }));
  }

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
    if (!allRequired) {
      setError("필수 약관에 모두 동의해주세요.");
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
        ageOver14: consent.age,
        agreedTerms: consent.terms,
        agreedPrivacy: consent.privacy,
        agreedMarketing: consent.marketing,
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
            { name: "email",    label: "이메일",  type: "email",    required: true,  placeholder: "email@example.com", autoComplete: "username email", hint: "" },
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

          {/* 약관 동의 섹션 */}
          <fieldset className="rounded-xl p-3.5 space-y-2" style={{ border: "1.5px solid var(--border)", background: "#fafafa" }}>
            <legend className="px-1.5 text-[12px] font-bold" style={{ color: "var(--text-2)" }}>약관 동의</legend>

            {/* 전체 동의 */}
            <label className="flex items-center gap-2 pb-2 cursor-pointer" style={{ borderBottom: "1px dashed var(--border)" }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="전체 동의"
                className="w-4 h-4 accent-green-700"
              />
              <span className="text-[13px] font-bold" style={{ color: "var(--text-1)" }}>전체 동의 (마케팅 포함)</span>
            </label>

            {(Object.keys(CONSENT_LABELS) as ConsentKey[]).map((key) => {
              const c = CONSENT_LABELS[key];
              return (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-[12px]" style={{ color: "var(--text-2)" }}>
                  <input
                    type="checkbox"
                    checked={consent[key]}
                    onChange={() => toggleOne(key)}
                    aria-label={c.label}
                    className="w-4 h-4 accent-green-700"
                  />
                  <span>
                    <span style={{ color: c.required ? "#e11d48" : "var(--text-3)" }} className="font-bold mr-1">
                      [{c.required ? "필수" : "선택"}]
                    </span>
                    {c.label}
                  </span>
                  {c.link && (
                    <Link
                      href={c.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[11px] underline"
                      style={{ color: "var(--jade-700)" }}
                    >
                      {c.link.text}
                    </Link>
                  )}
                </label>
              );
            })}

            <p className="text-[10.5px] pt-1.5" style={{ color: "var(--text-3)" }}>
              만 14세 미만 아동은 법정대리인 동의가 필요하므로 회원가입이 제한됩니다.
            </p>
          </fieldset>

          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-[12px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !allRequired}
            className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-all mt-1"
            style={{ background: "var(--jade-950)", color: "white", opacity: (loading || !allRequired) ? 0.5 : 1 }}
          >
            {loading ? "처리 중..." : !allRequired ? "필수 약관 동의 필요" : "회원가입"}
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
