import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onSubmit: (nickname: string) => void;
  isLoading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onSubmit,
  isLoading = false,
}) => {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onSubmit(nickname.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <h2 className="text-lg font-bold mb-1">Добро пожаловать!</h2>
          <p className="text-sm opacity-90">
            Введите ваш ник из baza.vteplo.tours
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ваш ник
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введите ник..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              autoFocus
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Это позволит нам найти вас в рейтинге и отметить ваши достижения
            </p>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim() || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isLoading ? "Поиск..." : "Продолжить"}
          </button>
        </form>
      </div>
    </div>
  );
};