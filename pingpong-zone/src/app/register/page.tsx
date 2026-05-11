"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
            { name: "name",     label: "이름",    type: "text",     required: true,  placeholder: "홍길동" },
            { name: "email",    label: "이메일",  type: "email",    required: true,  placeholder: "email@example.com" },
            { name: "password", label: "비밀번호", type: "password", required: true,  placeholder: "••••••••" },
            { name: "phone",    label: "전화번호", type: "tel",      required: false, placeholder: "010-0000-0000 (선택)" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                name={field.name}
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          ))}

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
