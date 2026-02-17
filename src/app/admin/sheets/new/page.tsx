"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { isSupportedMusicXml } from "@/lib/utils/musicxml";
import { TRACK_TYPES, type TrackType } from "@/lib/constants/track-types";

export default function NewSheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [musicXmlFile, setMusicXmlFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    composer: "",
    arranger: "",
    description: "",
    genre: "",
    key_signature: "",
    time_signature: "4/4",
    tempo_bpm: "",
    is_public: false,
    tags: "",
  });

  // Audio tracks state
  const [audioTracks, setAudioTracks] = useState<
    { file: File; label: string; track_type: TrackType; key_shift: number }[]
  >([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return alert("PDF 파일을 선택해주세요");

    setLoading(true);
    try {
      const body = new FormData();
      body.append("pdf", pdfFile);
      if (musicXmlFile) {
        body.append("musicxml", musicXmlFile);
      }

      const metadata = {
        ...formData,
        tempo_bpm: formData.tempo_bpm ? parseInt(formData.tempo_bpm) : undefined,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      };
      body.append("metadata", JSON.stringify(metadata));

      const res = await fetch("/api/sheets", { method: "POST", body });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "악보 생성 실패");
      }

      const sheet = await res.json();

      // Upload audio tracks
      for (const track of audioTracks) {
        const trackBody = new FormData();
        trackBody.append("audio", track.file);
        trackBody.append(
          "metadata",
          JSON.stringify({
            label: track.label,
            track_type: track.track_type,
            key_shift: track.key_shift,
            sort_order: audioTracks.indexOf(track),
          })
        );

        await fetch(`/api/sheets/${sheet.id}/tracks`, {
          method: "POST",
          body: trackBody,
        });
      }

      router.push("/admin/sheets");
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const addAudioTrack = (file: File) => {
    setAudioTracks((prev) => [
      ...prev,
      { file, label: file.name, track_type: "full" as TrackType, key_shift: 0 },
    ]);
  };

  const removeAudioTrack = (index: number) => {
    setAudioTracks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAudioTrack = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setAudioTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleMusicXmlSelect = (file: File) => {
    if (!isSupportedMusicXml(file.name)) {
      alert("지원되지 않는 파일 형식입니다. .musicxml 또는 .mxl 파일을 선택해주세요.");
      return;
    }
    setMusicXmlFile(file);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">새 악보 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* PDF Upload */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            PDF 악보 파일
          </h2>
          <FileDropzone
            accept=".pdf"
            onFileSelect={setPdfFile}
            currentFile={pdfFile}
            label="PDF 파일을 드래그하거나 클릭하여 업로드"
          />
        </section>

        {/* MusicXML Upload (optional) */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            MusicXML 파일 (선택)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            MusicXML 파일을 추가하면 인터랙티브 악보 뷰어를 사용할 수 있습니다.
          </p>
          <FileDropzone
            accept=".musicxml,.mxl,.xml"
            onFileSelect={handleMusicXmlSelect}
            currentFile={musicXmlFile}
            label="MusicXML 파일을 드래그하거나 클릭하여 업로드 (.musicxml, .mxl)"
          />
        </section>

        {/* Metadata */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            악보 정보
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 *
            </label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                작곡자
              </label>
              <input
                name="composer"
                value={formData.composer}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                편곡자
              </label>
              <input
                name="arranger"
                value={formData.arranger}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                장르
              </label>
              <input
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key
              </label>
              <input
                name="key_signature"
                value={formData.key_signature}
                onChange={handleChange}
                placeholder="C major"
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                박자
              </label>
              <input
                name="time_signature"
                value={formData.time_signature}
                onChange={handleChange}
                placeholder="4/4"
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BPM
              </label>
              <input
                name="tempo_bpm"
                type="number"
                value={formData.tempo_bpm}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                태그 (쉼표로 구분)
              </label>
              <input
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="찬양, 워십, CCM"
                className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              id="is_public"
              className="rounded border-gray-500 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              공개 악보로 등록
            </label>
          </div>
        </section>

        {/* Audio Tracks */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            음원 트랙
          </h2>

          {audioTracks.map((track, index) => (
            <div
              key={index}
              className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-3 gap-2">
                <input
                  value={track.label}
                  onChange={(e) =>
                    updateAudioTrack(index, "label", e.target.value)
                  }
                  placeholder="라벨"
                  className="px-2 py-1 border border-gray-500 rounded text-sm"
                />
                <select
                  value={track.track_type}
                  onChange={(e) =>
                    updateAudioTrack(index, "track_type", e.target.value)
                  }
                  className="px-2 py-1 border border-gray-500 rounded text-sm"
                >
                  {Object.entries(TRACK_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                {track.track_type === "key_shifted" && (
                  <input
                    type="number"
                    value={track.key_shift}
                    onChange={(e) =>
                      updateAudioTrack(
                        index,
                        "key_shift",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="반음"
                    className="px-2 py-1 border border-gray-500 rounded text-sm"
                  />
                )}
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[120px]">
                {track.file.name}
              </span>
              <button
                type="button"
                onClick={() => removeAudioTrack(index)}
                className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
              >
                삭제
              </button>
            </div>
          ))}

          <FileDropzone
            accept="audio/*"
            onFileSelect={addAudioTrack}
            label="음원 파일을 드래그하거나 클릭하여 추가"
          />
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !pdfFile}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
        >
          {loading ? "등록 중..." : "악보 등록"}
        </button>
      </form>
    </div>
  );
}
