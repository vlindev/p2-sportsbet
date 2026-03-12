"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Pencil, Check } from "lucide-react";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  referrer_id: string | null;
  created_at: string;
};

type Form = {
  name: string;
  phone: string;
  referrer_id: string;
  active: boolean;
};

function formatBalance(net_liang: number): string {
  const ntd = Math.abs(net_liang) * 1000;
  const formatted = ntd.toLocaleString("zh-TW");
  return net_liang >= 0 ? `+${formatted} NTD` : `-${formatted} NTD`;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<Form>({ name: "", phone: "", referrer_id: "", active: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setFetchError(null);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [memberRes, settlementRes] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("settlements").select("member_id, net_liang").eq("year", year).eq("month", month),
    ]);

    if (memberRes.error) {
      console.error("Fetch members failed:", memberRes.error);
      setFetchError("無法載入會員資料，請重新整理頁面");
      setLoading(false);
      return;
    }

    if (settlementRes.error) {
      console.error("Fetch settlements failed:", settlementRes.error);
    }

    setMembers(memberRes.data || []);

    const map: Record<string, number> = {};
    for (const s of settlementRes.data || []) {
      map[s.member_id] = s.net_liang;
    }
    setBalanceMap(map);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", phone: "", referrer_id: "", active: true });
    setSaveError(null);
    setShowModal(true);
  }

  function openEditMember(member: Member) {
    setEditing(member);
    setForm({
      name: member.name,
      phone: member.phone || "",
      referrer_id: member.referrer_id || "",
      active: member.active,
    });
    setSaveError(null);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    // Intercept: if editing an active member and toggling to inactive, confirm first
    if (editing && editing.active && !form.active && !showDeactivateConfirm) {
      setShowDeactivateConfirm(true);
      return;
    }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    setSaveError(null);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      referrer_id: form.referrer_id || null,
      active: form.active,
    };
    if (editing) {
      const { error } = await supabase.from("members").update(payload).eq("id", editing.id);
      if (error) { console.error("Update member failed:", error); setSaveError("儲存失敗，請稍後再試"); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("members").insert(payload);
      if (error) { console.error("Insert member failed:", error); setSaveError("新增失敗，請稍後再試"); setSaving(false); return; }
    }
    await fetchAll();
    setSaving(false);
    setShowModal(false);
    setShowDeactivateConfirm(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("members").delete().eq("id", deleteTarget.id);
    if (error) {
      setDeleteError("此會員已有賽事或投注紀錄，無法刪除。如需隱藏，請改用「停用」功能。");
      setDeleting(false);
    } else {
      await fetchAll();
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  function jumpToMember(id: string) {
    setHighlightedId(id);
    rowRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedId(null), 1600);
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const qDigits = q.replace(/-/g, "");
    return (
      m.name.toLowerCase().includes(q) ||
      (m.phone && m.phone.replace(/-/g, "").includes(qDigits))
    );
  });

  const activeCount = members.filter((m) => m.active).length;

  return (
    <div className="p-6 pt-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">會員名冊</h1>
          <p className="text-base text-slate-500 mt-1">
            共 <span className="text-orange-500 font-semibold">{activeCount}</span> 名活躍會員
            · 合計 <span className="font-medium text-slate-600">{members.length}</span> 人
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm border cursor-pointer ${
              editMode
                ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-900"
                : "bg-slate-700 text-white border-slate-700 hover:bg-slate-800"
            }`}
          >
            {editMode ? (
              <>
                <Check size={14} />
                完成
              </>
            ) : (
              <>
                <Pencil size={14} />
                編輯
              </>
            )}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            新增會員
          </button>
        </div>
      </div>

      {editMode && (
        <p className="text-xs text-slate-400 mt-2 mb-0">
          點選會員列可編輯資料 · 點選 <span className="text-red-400 font-bold">−</span> 可永久刪除
        </p>
      )}

      {/* Search */}
      <div className="relative mb-4 mt-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜尋姓名或電話..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
        />
      </div>

      {/* Table */}
      {fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-red-500">{fetchError}</p>
          <button onClick={() => fetchAll()} className="text-sm text-orange-500 hover:text-orange-700 transition-colors cursor-pointer">重新載入</button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          載入中...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {editMode && <th className="w-10" />}
                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wide w-10">#</th>
                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wide">姓名</th>
                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wide">電話</th>
                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wide">介紹人</th>
                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wide">本月結餘</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={editMode ? 6 : 5} className="text-center py-12 text-slate-400">
                    {search ? "找不到符合的會員" : "尚無會員，請點擊「新增會員」"}
                  </td>
                </tr>
              ) : (
                filtered.map((member, i) => {
                  const isHighlighted = highlightedId === member.id;
                  const hasBalance = member.id in balanceMap;
                  const net = balanceMap[member.id];

                  return (
                    <tr
                      key={member.id}
                      ref={(el) => { rowRefs.current[member.id] = el; }}
                      onClick={() => {
                        if (editMode) openEditMember(member);
                        else setSelectedId(selectedId === member.id ? null : member.id);
                      }}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${
                        isHighlighted
                          ? "row-highlight"
                          : editMode
                          ? "cursor-pointer hover:bg-orange-50/40"
                          : selectedId === member.id
                          ? "bg-orange-50 border-l-4 border-l-orange-400"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Delete button — edit mode only */}
                      {editMode && (
                        <td className="pl-4 pr-0 py-4 w-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(member);
                              setDeleteError(null);
                            }}
                            className="delete-btn-enter w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-base font-light leading-none transition-colors cursor-pointer"
                          >
                            −
                          </button>
                        </td>
                      )}

                      <td className={`px-5 py-4 text-xs font-semibold ${member.active ? "text-slate-500" : "text-slate-400"}`}>{i + 1}</td>
                      <td className={`px-5 py-4 font-medium ${member.active ? "text-slate-800" : "text-slate-400"}`}>{member.name}</td>
                      <td className={`px-5 py-4 font-medium ${member.active ? "text-slate-600" : "text-slate-400"}`}>{member.phone || "—"}</td>
                      <td className="px-5 py-4">
                        {member.referrer_id && memberMap[member.referrer_id] ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToMember(member.referrer_id!);
                            }}
                            className={`underline underline-offset-2 transition-colors cursor-pointer ${
                              member.active
                                ? "text-orange-500 hover:text-orange-700"
                                : "text-slate-400 hover:text-slate-500"
                            }`}
                          >
                            {memberMap[member.referrer_id]}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {hasBalance ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/reports?member=${member.id}`);
                            }}
                            className={`font-semibold text-sm tabular-nums transition-opacity hover:opacity-70 cursor-pointer ${
                              member.active
                                ? net > 0 ? "text-emerald-600" : net < 0 ? "text-red-500" : "text-slate-400"
                                : "text-slate-400"
                            }`}
                          >
                            {net === 0 ? "0 NTD" : formatBalance(net)}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editing ? "編輯會員" : "新增會員"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 block mb-1.5">
                  姓名 <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="請輸入姓名"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1.5">電話</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="選填"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1.5">介紹人</label>
                <select
                  value={form.referrer_id}
                  onChange={(e) => setForm({ ...form, referrer_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                >
                  <option value="">— 無 —</option>
                  {members
                    .filter((m) => m.id !== editing?.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Active toggle — only shown when editing */}
              {editing && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">帳號狀態</p>
                    <p className={`text-sm font-semibold mt-0.5 transition-colors duration-200 ${form.active ? "text-blue-500" : "text-slate-400"}`}>
                      {form.active ? "目前活躍" : "目前停用"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, active: !form.active }); setShowDeactivateConfirm(false); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                      form.active ? "bg-blue-400" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        form.active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-4 text-center">
                {saveError}
              </p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowModal(false); setShowDeactivateConfirm(false); }}
                className="flex-1 border border-gray-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {saving ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 text-center mb-4">確定停用此會員？</h2>
            <p className="text-base text-slate-600 text-center mb-2">
              「{editing?.name}」將無法在賽事中被選為選手。
            </p>
            <p className="text-sm text-slate-400 text-center mb-8">
              已有的賽事與投注記錄不受影響。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 border border-gray-200 text-slate-600 py-3 rounded-xl text-base hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Pencil size={14} className="inline mr-1" />返回修改
              </button>
              <button
                onClick={doSave}
                disabled={saving}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl text-base font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {saving ? "儲存中..." : "確定停用"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <span className="text-red-500 text-2xl font-light">−</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 text-center mb-1">確定永久刪除？</h2>
            <p className="text-sm text-slate-500 text-center mb-1">
              「{deleteTarget.name}」的所有資料將被移除。
            </p>
            <p className="text-xs text-red-400 text-center mb-5">此操作無法復原。</p>
            {deleteError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4 text-center">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="flex-1 border border-gray-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {deleting ? "刪除中..." : "確定刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
