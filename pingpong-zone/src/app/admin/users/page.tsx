"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  _count: { reservations: number };
};

export default function AdminUsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 401 || r.status === 403) { router.push("/"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setUsers(data); setLoading(false); }
      });
  }, [router]);

  async function toggleRole(user: User) {
    if (toggling === user.id) return;
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`${user.name}님을 ${newRole === "admin" ? "관리자" : "일반회원"}로 변경하시겠습니까?`)) return;
    setToggling(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
        toast.show(`${user.name}님 권한을 ${newRole === "admin" ? "관리자" : "일반"}로 변경했습니다.`, "success");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.show(data.error || "변경에 실패했습니다.", "error");
      }
    } finally {
      setToggling(null);
    }
  }

  const filtered = users.filter(
    (u) => u.name.includes(search) || u.email.includes(search) || (u.phone || "").includes(search)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-3xl font-bold">회원 관리</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        <input
          type="search"
          placeholder="이름, 이메일, 연락처 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="회원 검색"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-64"
        />
        <span className="text-sm text-gray-500">{filtered.length}명</span>
      </div>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                {["이름", "이메일", "연락처", "예약수", "가입일", "권한", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || "-"}</td>
                  <td className="px-4 py-3 text-center">{u._count.reservations}</td>
                  <td className="px-4 py-3 text-gray-500">{u.createdAt.split("T")[0]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.role === "admin" ? "관리자" : "일반"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={toggling === u.id}
                      className="text-xs text-blue-500 hover:underline disabled:opacity-40 disabled:cursor-wait"
                    >
                      {toggling === u.id ? "변경 중..." : u.role === "admin" ? "일반으로 변경" : "관리자로 변경"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
