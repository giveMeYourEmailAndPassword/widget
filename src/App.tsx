import "./App.css";
import { useEffect, useState, useMemo } from "react";
import { useManagersLeaderboard } from "./api";
import { loginToPocketBase } from "./pocketbase";
import { LeaderboardManagerData } from "./types";
import { formatNumber } from "./lib/utils";
import { Medal } from "./components/Medal";
import { MotivationElements } from "./components/MotivationElements";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start, endDate: now };
  }, []);

  const {
    data: managersLeaderboard,
    isLoading: managersLoading,
    error: managersError,
  } = useManagersLeaderboard(
    startDate, // Начало текущего месяца
    endDate, // Сегодня
    undefined // Показываем всех менеджеров без фильтра по офису
  );

  // Автоматический вход при загрузке приложения
  useEffect(() => {
    const handleLogin = async () => {
      try {
        await loginToPocketBase();
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Login error:", error);
        setIsLoggedIn(false);
      }
    };

    handleLogin();
  }, []);

  // Показываем загрузку во время входа
  if (!isLoggedIn || managersLoading) {
    return (
      <main className="container">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Загрузка данных...</h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </main>
    );
  }

  // Показываем ошибку, если что-то пошло не так
  if (managersError) {
    return (
      <main className="container">
        <div className="p-2">
          <h1 className="text-3xl font-bold mb-4 text-red-600">
            Ошибка загрузки
          </h1>
          <p className="text-gray-600">{managersError?.message}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="container mx-auto">
        <div className="p-2">
          <div className="mb-3 text-center">
            <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🏆 Лидерборд
            </h1>
            <div className="flex gap-2 items-center justify-center">
              <p className="text-xs text-gray-600">Лучшие менеджеры месяца</p>
              <p className="text-xs font-bold text-gray-800">
                {managersLeaderboard.length}
              </p>
              <p className="text-xs text-gray-500">участ.</p>
            </div>
          </div>

          {new Date().getDate() <= 3 &&
            managersLeaderboard.some((m) =>
              m.managerId.startsWith("mock-")
            ) && (
              <div className="mb-3 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <div>
                    <p className="text-xs font-medium text-yellow-800">
                      Демо-данные начнут обновляться
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Топ-3 карточки - вертикальные */}
          {managersLeaderboard && managersLeaderboard.length > 0 && (
            <div className="space-y-2 mb-4">
              {managersLeaderboard.slice(0, 3).map((manager, index) => (
                <div
                  key={manager.managerId}
                  className={`relative bg-white rounded-lg shadow-md overflow-hidden border ${
                    manager.rank === 1
                      ? "border-yellow-400 border-2"
                      : manager.rank === 2
                      ? "border-gray-300"
                      : "border-orange-300"
                  }`}
                >
                  <div
                    className={`h-1 bg-gradient-to-r ${
                      manager.rank === 1
                        ? "from-yellow-400 to-yellow-600"
                        : manager.rank === 2
                        ? "from-gray-300 to-gray-500"
                        : "from-orange-300 to-orange-500"
                    }`}
                  ></div>

                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Medal rank={manager.rank} size="medium" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">
                            {manager.managerName}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {manager.officeName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-800">
                          ${formatNumber(manager.totalCommissionUSD)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {manager.contractCount} контрактов
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        {manager.rank === 1 && (
                          <span className="text-yellow-600 font-medium">
                            🔥 Чемпион
                          </span>
                        )}
                        {manager.rank === 2 && (
                          <span className="text-gray-600 font-medium">
                            💪 Почти цель
                          </span>
                        )}
                        {manager.rank === 3 && (
                          <span className="text-orange-600 font-medium">
                            🎯 Отлично
                          </span>
                        )}
                      </div>
                      {manager.isCurrentUser && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          ✨ Вы
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Остальные участники - компактная таблица */}
          {managersLeaderboard && managersLeaderboard.length > 3 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">
                  📋 Остальные участники
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {managersLeaderboard
                  .slice(3)
                  .map((manager: LeaderboardManagerData) => (
                    <div
                      key={manager.managerId}
                      className={`px-3 py-2 ${
                        manager.isCurrentUser ? "bg-green-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Medal rank={manager.rank} size="small" />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-900">
                                {manager.managerName}
                              </span>
                              {manager.isCurrentUser && (
                                <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                  Вы
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {manager.officeName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            ${formatNumber(manager.totalCommissionUSD)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {manager.contractCount} контрактов
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
