import Link from "next/link";
import { Music } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Music className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-gray-500 mb-6">
          요청하신 페이지가 존재하지 않거나 삭제되었습니다.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
