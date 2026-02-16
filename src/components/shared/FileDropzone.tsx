"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FileDropzoneProps {
  accept: string;
  onFileSelect: (file: File) => void;
  label?: string;
  currentFile?: File | null;
}

export function FileDropzone({
  accept,
  onFileSelect,
  label = "파일을 드래그하거나 클릭하여 업로드",
  currentFile,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-300 hover:border-gray-400"
      )}
    >
      <label className="cursor-pointer flex flex-col items-center gap-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600">
          {currentFile ? currentFile.name : label}
        </p>
        {currentFile && (
          <p className="text-xs text-gray-400">
            {(currentFile.size / (1024 * 1024)).toFixed(1)} MB
          </p>
        )}
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
