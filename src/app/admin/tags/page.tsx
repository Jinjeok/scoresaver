"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import type { Tag } from "@/types/sheet";

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (res.ok) setTags(await res.json());
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag.trim() }),
    });

    if (res.ok) {
      setNewTag("");
      fetchTags();
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">태그 관리</h1>

      <form onSubmit={addTag} className="flex gap-2 mb-6">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="새 태그 이름"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            전체 태그 ({tags.length})
          </h2>
        </div>
        <div className="p-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
            >
              {tag.name}
            </span>
          ))}
          {tags.length === 0 && (
            <p className="text-gray-600">등록된 태그가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
