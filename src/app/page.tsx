import Link from "next/link";
import { Music, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="text-center max-w-2xl mx-auto px-4">
        <Music className="h-16 w-16 text-indigo-600 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">ScoreSaver</h1>
        <p className="text-lg text-gray-600 mb-8">
          악보와 음원을 저장하고, 공유하고, 함께 연습하세요.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sheets"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            악보 둘러보기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
