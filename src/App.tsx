import "./App.css";
import { useEffect, useState, useMemo } from "react";
import { useManagersLeaderboard } from "./api";
import { loginToPocketBase } from "./pocketbase";
import { LeaderboardManagerData } from "./types";
import { formatNumber } from "./lib/utils";
import { Medal } from "./components/Medal";
import { MonthCalendar } from "./components/MonthCalendar";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      1
    );

    // Если выбран текущий месяц, то end = сегодня, иначе = конец месяца
    const end =
      selectedMonth.getMonth() === now.getMonth() &&
      selectedMonth.getFullYear() === now.getFullYear()
        ? now
        : new Date(
            selectedMonth.getFullYear(),
            selectedMonth.getMonth() + 1,
            0
          );

    return { startDate: start, endDate: end };
  }, [selectedMonth]);

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
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50/70 via-white/60 to-purple-50/30 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-14 w-14 border-2 border-gray-300 border-t-blue-600 mb-4"></div>
        </div>
      </div>
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
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50/70 via-white/60 to-purple-50/30 backdrop-blur-sm">
      <main className="container mx-auto">
        <div className="p-2">
          <div className="mb-3 text-center">
            <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🏆 Лидерборд
            </h1>
            <div className="flex gap-2 items-center justify-center flex-wrap">
              <p className="text-xs text-gray-600">Результаты</p>
              <p className="text-xs font-bold text-gray-800">
                {selectedMonth.toLocaleDateString("ru-RU", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-gray-500">•</p>
              <p className="text-xs font-bold text-gray-800">
                {managersLeaderboard.length}
              </p>
              <p className="text-xs text-gray-500">менеджеров</p>
            </div>
          </div>

          {new Date().getDate() <= 3 &&
            selectedMonth.getMonth() === new Date().getMonth() &&
            selectedMonth.getFullYear() === new Date().getFullYear() &&
            managersLeaderboard.some((m) =>
              m.managerId.startsWith("mock-")
            ) && (
              <div className="mb-3 p-2 bg-gradient-to-r from-yellow-50/80 to-orange-50/80 backdrop-blur-sm border border-yellow-200/60 rounded-lg">
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

          {!managersLeaderboard.some((m) => m.managerId.startsWith("mock-")) &&
            managersLeaderboard.length === 0 && (
              <div className="mb-3 p-2 bg-gray-50/80 backdrop-blur-sm border border-gray-200/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      Нет данных за выбранный период
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
                  className={`relative bg-white/70 backdrop-blur-sm rounded-lg shadow-md/50 overflow-hidden border ${
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
            <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md/50 overflow-hidden">
              <div className="bg-gray-50/80 backdrop-blur-sm px-3 py-2 border-b border-gray-200/60">
                <h3 className="text-sm font-semibold text-gray-700">
                  📋 Остальные менеджеры
                </h3>
              </div>
              <div className="divide-y divide-gray-100/60">
                {managersLeaderboard
                  .slice(3)
                  .map((manager: LeaderboardManagerData) => (
                    <div
                      key={manager.managerId}
                      className={`px-3 py-2 ${
                        manager.isCurrentUser
                          ? "bg-green-50/70 backdrop-blur-sm"
                          : ""
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

          {/* Календарь выбора месяца */}
          <div className="mt-4">
            <MonthCalendar
              selectedDate={selectedMonth}
              onDateChange={setSelectedMonth}
              isLoading={managersLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
