import "./App.css";
import { useEffect, useState, useMemo } from "react";
import {
  useManagersLeaderboard,
  useUserStats,
  findUserByNickname,
} from "./api";
import { loginToPocketBase } from "./pocketbase";
import { LeaderboardManagerData } from "./types";
import {
  formatNumber,
  contractWord,
  getUserNickname,
  saveUserNickname,
  saveUserId,
  getUserId,
  clearUserData,
  getUserOfficeName,
  saveUserOfficeName,
} from "./lib/utils";
import { Medal } from "./components/Medal";
import { MonthCalendar } from "./components/MonthCalendar";
import { AuthModal } from "./components/AuthModal";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserNickname, setCurrentUserNickname] = useState<string | null>(
    null
  );
  const [currentUserOfficeName, setCurrentUserOfficeName] = useState<
    string | null
  >(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "warning" | "info" | "error";
    message: string;
  } | null>(null);
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
    undefined, // Показываем всех менеджеров без фильтра по офису
    currentUserId // ID текущего пользователя для подсветки
  );

  // Получаем статистику текущего пользователя
  const { data: currentUserStats, isLoading: userStatsLoading } = useUserStats(
    currentUserId || "",
    startDate,
    endDate,
    currentUserNickname || undefined,
    currentUserOfficeName || undefined
  );

  // Комбинированный лидерборд с пользователем
  const combinedLeaderboard = useMemo(() => {
    if (!managersLeaderboard) return [];

    // Если у пользователя есть данные, добавляем его в рейтинг
    if (currentUserId && currentUserStats) {
      // Создаем новый массив с пользователем
      const allManagers = [...managersLeaderboard, currentUserStats];

      // Убираем дубликаты пользователя (если он уже есть в лидерборде)
      const uniqueManagers = allManagers.filter(
        (manager, index, self) =>
          index === self.findIndex((m) => m.managerId === manager.managerId)
      );

      // Сортируем по убыванию комиссии
      const sorted = uniqueManagers.sort(
        (a, b) => b.totalCommissionUSD - a.totalCommissionUSD
      );

      // Переназначаем ранги
      return sorted.map((manager, index) => ({
        ...manager,
        rank: index + 1,
        isCurrentUser: manager.managerId === currentUserId,
      }));
    }

    // Если пользователя нет в системе, показываем обычный лидерборд
    return managersLeaderboard;
  }, [managersLeaderboard, currentUserStats, currentUserId]);

  // Определяем, есть ли текущий пользователь в топ-3
  const currentUserInTop3 = useMemo(() => {
    if (!combinedLeaderboard || !currentUserId) return false;
    return combinedLeaderboard
      .slice(0, 3)
      .some((manager) => manager.isCurrentUser);
  }, [combinedLeaderboard, currentUserId]);

  // Получаем данные текущего пользователя для отдельной карточки
  const currentUserCard = useMemo(() => {
    if (!currentUserInTop3 && currentUserId && currentUserStats) {
      const userInLeaderboard = combinedLeaderboard.find(
        (m) => m.isCurrentUser
      );
      if (userInLeaderboard) {
        return {
          ...userInLeaderboard,
          rank: userInLeaderboard.rank,
          isCurrentUser: true,
        };
      }
    }
    return null;
  }, [currentUserInTop3, currentUserId, currentUserStats, combinedLeaderboard]);

  // Автоматический вход при загрузке приложения
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await loginToPocketBase();
        setIsLoggedIn(true);

        // Проверяем, есть ли сохраненные данные пользователя
        const savedNickname = getUserNickname();
        const savedUserId = getUserId();

        if (savedNickname && savedUserId) {
          const savedOfficeName = getUserOfficeName();
          setCurrentUserNickname(savedNickname);
          setCurrentUserId(savedUserId);
          setCurrentUserOfficeName(savedOfficeName);
        } else {
          // Если нет сохраненных данных, показываем модальное окно
          setIsAuthModalOpen(true);
        }
      } catch (error) {
        console.error("Login error:", error);
        setIsLoggedIn(false);
      }
    };

    initializeApp();
  }, []);

  // Обработчик отправки ника
  const handleNicknameSubmit = async (nickname: string) => {
    setIsAuthenticating(true);
    try {
      const user = await findUserByNickname(nickname);
      if (user) {
        // Пользователь найден в системе
        const officeName = user.expand?.office?.name || "Без офиса";
        setCurrentUserNickname(user.name);
        setCurrentUserId(user.id);
        setCurrentUserOfficeName(officeName);
        saveUserNickname(user.name);
        saveUserId(user.id);
        saveUserOfficeName(officeName);

        // Сбрасываем скролл наверх
        window.scrollTo(0, 0);

        setIsAuthModalOpen(false);
      } else {
        // Пользователь не найден, но впускаем его
        const tempId = `temp-${Date.now()}`;
        const officeName = "Без офиса";
        setCurrentUserNickname(nickname);
        setCurrentUserId(tempId);
        setCurrentUserOfficeName(officeName);
        saveUserNickname(nickname);
        saveUserId(tempId);
        saveUserOfficeName(officeName);

        // Сбрасываем скролл наверх
        window.scrollTo(0, 0);

        setIsAuthModalOpen(false);

        // Показываем уведомление о том, что пользователь не найден
        setNotification({
          type: "warning",
          message: `Профиль "${nickname}" не найден в системе. Возможно, у вас пока нет контрактов или ник указан неверно.`,
        });
      }
    } catch (error) {
      console.error("Error finding user:", error);
      // Даже при ошибке впускаем пользователя
      const tempId = `temp-${Date.now()}`;
      const officeName = "Без офиса";
      setCurrentUserNickname(nickname);
      setCurrentUserId(tempId);
      setCurrentUserOfficeName(officeName);
      saveUserNickname(nickname);
      saveUserId(tempId);
      saveUserOfficeName(officeName);

      // Сбрасываем скролл наверх
      window.scrollTo(0, 0);

      setIsAuthModalOpen(false);

      // Показываем уведомление об ошибке
      setNotification({
        type: "error",
        message:
          "Произошла ошибка при поиске пользователя. Вы вошли как гость.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Обработчик выхода
  const handleLogout = () => {
    clearUserData();
    setCurrentUserId(null);
    setCurrentUserNickname(null);
    setCurrentUserOfficeName(null);
    setIsAuthModalOpen(true);
  };

  // Автоматическое скрытие уведомления через 5 секунд
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
                {combinedLeaderboard.length}
              </p>
              <p className="text-xs text-gray-500">менеджеров</p>
            </div>
          </div>

          {/* Уведомление пользователю */}
          {notification && (
            <div
              className={`mb-3 p-2 backdrop-blur-sm border rounded-lg ${
                notification.type === "warning"
                  ? "bg-yellow-50/80 border-yellow-200/60"
                  : notification.type === "error"
                  ? "bg-red-50/80 border-red-200/60"
                  : "bg-blue-50/80 border-blue-200/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {notification.type === "warning"
                      ? "⚠️"
                      : notification.type === "error"
                      ? "❌"
                      : "ℹ️"}
                  </span>
                  <div>
                    <p
                      className={`text-xs font-medium ${
                        notification.type === "warning"
                          ? "text-yellow-800"
                          : notification.type === "error"
                          ? "text-red-800"
                          : "text-blue-800"
                      }`}
                    >
                      {notification.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {new Date().getDate() <= 3 &&
            selectedMonth.getMonth() === new Date().getMonth() &&
            selectedMonth.getFullYear() === new Date().getFullYear() &&
            combinedLeaderboard.some((m) =>
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

          {!combinedLeaderboard.some((m) => m.managerId.startsWith("mock-")) &&
            combinedLeaderboard.length === 0 && (
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
          {combinedLeaderboard && combinedLeaderboard.length > 0 && (
            <div className="space-y-2 mb-4">
              {combinedLeaderboard.slice(0, 3).map((manager, index) => (
                <div
                  key={manager.managerId}
                  className={`relative bg-white/70 backdrop-blur-sm rounded-lg shadow-md/50 overflow-hidden border ${
                    manager.rank === 1
                      ? "border-yellow-400 border-2"
                      : manager.rank === 2
                      ? "border-gray-300"
                      : manager.rank === 3
                      ? "border-orange-300"
                      : manager.isCurrentUser
                      ? "border-green-400 border-2"
                      : "border-gray-200"
                  }`}
                >
                  <div
                    className={`h-1 bg-gradient-to-r ${
                      manager.rank === 1
                        ? "from-yellow-400 to-yellow-600"
                        : manager.rank === 2
                        ? "from-gray-300 to-gray-500"
                        : manager.rank === 3
                        ? "from-orange-300 to-orange-500"
                        : manager.isCurrentUser
                        ? "from-green-400 to-green-600"
                        : "from-gray-200 to-gray-400"
                    }`}
                  ></div>

                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Medal rank={manager.rank} size="medium" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">
                            {manager.managerName}{" "}
                            {manager.isCurrentUser && (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                ✨ Вы
                              </span>
                            )}
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
                          {manager.contractCount}{" "}
                          {contractWord(manager.contractCount)}
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
                        {manager.isCurrentUser && manager.rank > 3 && (
                          <span className="text-green-600 font-medium">
                            📊 Ваш результат
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Отдельная карточка для текущего пользователя, если его нет в топ-3 */}
              {!currentUserInTop3 && currentUserCard && (
                <div className="relative bg-white/70 backdrop-blur-sm rounded-lg shadow-md/50 overflow-hidden border-2 border-green-400">
                  <div className="h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Medal rank={currentUserCard.rank} size="medium" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">
                            {currentUserCard.managerName}{" "}
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              ✨ Вы
                            </span>
                          </h3>
                          <p className="text-xs text-gray-500">
                            {currentUserCard.officeName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-800">
                          ${formatNumber(currentUserCard.totalCommissionUSD)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {currentUserCard.contractCount}{" "}
                          {contractWord(currentUserCard.contractCount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">
                          📈 Вперед к цели!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Остальные участники - компактная таблица */}
          {combinedLeaderboard && combinedLeaderboard.length > 3 && (
            <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md/50 overflow-hidden">
              <div className="bg-gray-50/80 backdrop-blur-sm px-3 py-2 border-b border-gray-200/60">
                <h3 className="text-sm font-semibold text-gray-700">
                  📋 Остальные менеджеры
                </h3>
              </div>
              <div className="divide-y divide-gray-100/60">
                {combinedLeaderboard
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
                            {manager.contractCount}{" "}
                            {contractWord(manager.contractCount)}
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

      {/* Модальное окно авторизации */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSubmit={handleNicknameSubmit}
        isLoading={isAuthenticating}
      />

      {currentUserNickname && (
        <div className="flex justify-center pb-2">
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
          >
            🚪 Выйти ({currentUserNickname})
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
