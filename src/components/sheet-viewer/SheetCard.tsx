import Link from "next/link";
import { FileMusic, Eye, EyeOff } from "lucide-react";
import type { SheetWithTags } from "@/types/sheet";

interface SheetCardProps {
  sheet: SheetWithTags;
  href: string;
}

export function SheetCard({ sheet, href }: SheetCardProps) {
  return (
    <Link
      href={href}
      className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
        <FileMusic className="h-16 w-16 text-gray-300" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {sheet.title}
          </h3>
          {sheet.is_public ? (
            <Eye className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400 shrink-0" />
          )}
        </div>

        {sheet.composer && (
          <p className="text-sm text-gray-500 mt-1">{sheet.composer}</p>
        )}

        {sheet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {sheet.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
