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
  const [showFullList, setShowFullList] = useState(false);
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
    currentUserId || undefined // ID текущего пользователя для подсветки
  );

  // Получаем статистику текущего пользователя
  const { data: currentUserStats } = useUserStats(
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

  // Фильтруем список для отображения
  const visibleLeaderboard = useMemo(() => {
    if (
      !combinedLeaderboard ||
      !currentUserId ||
      showFullList ||
      currentUserInTop3
    ) {
      return combinedLeaderboard;
    }

    const currentUserIndex = combinedLeaderboard.findIndex(
      (m) => m.isCurrentUser
    );
    if (currentUserIndex === -1) {
      return combinedLeaderboard;
    }

    // Показываем топ-3 + текущего пользователя + 2 человека ниже и выше
    const top3 = combinedLeaderboard.slice(0, 3);
    const currentUser = combinedLeaderboard[currentUserIndex];
    const aroundCurrentUser = combinedLeaderboard.slice(
      Math.max(0, currentUserIndex - 2),
      Math.min(combinedLeaderboard.length, currentUserIndex + 3)
    );

    // Объединяем и убираем дубликаты
    const allVisible = [...top3, ...aroundCurrentUser];
    return allVisible
      .filter(
        (manager, index, self) =>
          index === self.findIndex((m) => m.managerId === manager.managerId)
      )
      .sort((a, b) => a.rank - b.rank);
  }, [combinedLeaderboard, currentUserId, showFullList, currentUserInTop3]);

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
          message: `Профиль "${nickname}" не найден в системе. Возможно, у вас пока нет сделок или ник указан неверно.`,
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
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
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
    <div className="min-h-screen w-full bg-gray-50/50">
      <main className="container mx-auto max-w-md">
        <div className="p-2">
          {/* Уведомление пользователю */}
          {notification && (
            <div className="mb-3 p-2 bg-gray-50/80 backdrop-blur-sm border border-gray-200/60 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-700">
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {!combinedLeaderboard.some((m) => m.managerId.startsWith("mock-")) &&
            combinedLeaderboard.length === 0 && (
              <div className="mb-3 p-2 text-center text-xs text-gray-500">
                Нет данных за выбранный период
              </div>
            )}

          {/* Все менеджеры */}
          {combinedLeaderboard && combinedLeaderboard.length > 0 && (
            <div className="bg-white/40 backdrop-blur-sm border border-gray-200/60 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50/50 backdrop-blur-sm border-b border-gray-200/50 flex justify-between items-center">
                <p className="text-xs text-black">
                  {selectedMonth
                    .toLocaleDateString("ru-RU", {
                      month: "long",
                      year: "numeric",
                    })
                    .charAt(0)
                    .toUpperCase() +
                    selectedMonth
                      .toLocaleDateString("ru-RU", {
                        month: "long",
                        year: "numeric",
                      })
                      .slice(1)}
                </p>
                <p className="text-xs text-black">
                  {combinedLeaderboard.length} менеджеров
                </p>
              </div>
              <div className="divide-y divide-gray-100/50">
                {(() => {
                  const sortedVisible = [...visibleLeaderboard].sort(
                    (a, b) => a.rank - b.rank
                  );
                  const elements = [];

                  for (let i = 0; i < sortedVisible.length; i++) {
                    const manager = sortedVisible[i];

                    // Добавляем многоточие перед текущим элементом, если есть разрыв
                    if (i > 0 && manager.rank > sortedVisible[i - 1].rank + 1) {
                      elements.push(
                        <div
                          key={`gap-${manager.rank}`}
                          className="flex justify-center items-start"
                        >
                          <span className="text-4xl text-gray-400 mt-[-26px]">
                            ...
                          </span>
                        </div>
                      );
                    }

                    // Добавляем карточку менеджера
                    elements.push(
                      <div
                        key={manager.managerId}
                        className={`px-3 py-2 ${
                          manager.isCurrentUser
                            ? "bg-gray-50/50 backdrop-blur-sm"
                            : manager.rank <= 3
                            ? ""
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Medal rank={manager.rank} size="small" />
                            <div>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-sm ${
                                    manager.rank <= 3
                                      ? "font-semibold text-gray-900"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {manager.managerName}
                                </span>
                                {manager.isCurrentUser && (
                                  <span className="text-xs text-blue-600">
                                    (Вы)
                                  </span>
                                )}
                                {manager.rank <= 3 && (
                                  <span className="text-xs font-medium text-blue-600">
                                    {manager.rank === 1
                                      ? "🥇"
                                      : manager.rank === 2
                                      ? "🥈"
                                      : "🥉"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {manager.officeName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm ${
                                manager.rank <= 3
                                  ? "font-semibold text-gray-900"
                                  : "text-gray-900"
                              }`}
                            >
                              ${formatNumber(manager.totalCommissionUSD)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {manager.contractCount}{" "}
                              {contractWord(manager.contractCount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Добавляем многоточие в конце, если есть участники ниже последнего видимого
                  const lastVisibleRank =
                    sortedVisible[sortedVisible.length - 1]?.rank;
                  if (
                    lastVisibleRank &&
                    lastVisibleRank < combinedLeaderboard.length
                  ) {
                    elements.push(
                      <div
                        key="gap-end"
                        className="flex justify-center items-start"
                      >
                        <span className="text-4xl text-gray-400 mt-[-26px]">
                          ...
                        </span>
                      </div>
                    );
                  }

                  return elements;
                })()}
              </div>
            </div>
          )}

          {/* Кнопка показа полного списка */}
          {!showFullList &&
            !currentUserInTop3 &&
            currentUserId &&
            combinedLeaderboard &&
            visibleLeaderboard &&
            visibleLeaderboard.length < combinedLeaderboard.length && (
              <div className="mt-2 text-center">
                <button
                  onClick={() => setShowFullList(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100/50 py-1 px-3 rounded-2xl duration-300 hover:bg-gray-200/50 
                  font-medium"
                >
                  Показать всех ({combinedLeaderboard.length})
                </button>
              </div>
            )}

          {/* Кнопка скрытия списка */}
          {showFullList && !currentUserInTop3 && currentUserId && (
            <div className="mt-2 text-center">
              <button
                onClick={() => setShowFullList(false)}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                Скрыть часть менеджеров
              </button>
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
        <div className="flex justify-center mt-1 pb-3">
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100/50 py-1 px-3 rounded-2xl duration-300 hover:bg-gray-200/50
            font-medium"
          >
            Выйти ({currentUserNickname})
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
