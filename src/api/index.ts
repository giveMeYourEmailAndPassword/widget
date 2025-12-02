import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import pb from "../pocketbase";
import { Contract, ExchangeRates, User, LeaderboardOfficeData } from "../types";
import { formatPbDate } from "../lib/utils";

// Функция для получения курсов валют
const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const response = await fetch(
    "https://valuta-production.up.railway.app/rates",
    {
      headers: { Authorization: "Bearer ikram228112233" },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  return response.json();
};

// Функция для получения числового значения курса валюты
const getRateValue = (rate: number | ExchangeRateData): number => {
  if (typeof rate === "number") {
    return rate;
  }

  if (typeof rate === "object" && rate !== null) {
    return rate.buy || rate.sell || Object.values(rate)[0] || 1;
  }

  return 1;
};

// Функция для расчета комиссии в разных валютах
const getCommissionInCurrencies = (
  contract: Contract,
  rates: ExchangeRates
) => {
  const { netto_price, brutto_price, currency } = contract;
  const commission = (brutto_price || 0) - netto_price;

  const eurRate = getRateValue(rates.EUR);
  const rubRate = getRateValue(rates.RUB);
  const kgsRate = getRateValue(rates.KGS);
  const kztRate = getRateValue(rates.KZT);

  if (currency === "USD") {
    return {
      USD: commission,
      EUR: commission / eurRate,
      RUB: commission * rubRate,
      KGS: commission * kgsRate,
      KZT: commission * kztRate,
    };
  }

  // Конвертация в USD для других валют
  const usdRate = getRateValue(rates[currency]);
  const commissionUSD = commission / usdRate;

  return {
    USD: commissionUSD,
    EUR: commissionUSD / eurRate,
    RUB: commissionUSD * rubRate,
    KGS: commissionUSD * kgsRate,
    KZT: commissionUSD * kztRate,
  };
};

// Хук для курсов валют
export const useExchangeRates = () => {
  return useQuery({
    queryKey: ["exchangeRates"],
    queryFn: fetchExchangeRates,
    staleTime: 30 * 60 * 1000, // 30 минут кэширования
    retry: 2,
    retryDelay: 2000,
    refetchOnWindowFocus: false, // Отключаем автоматическое обновление при фокусе
    refetchOnReconnect: false, // Отключаем автоматическое обновление при реконнекте
    gcTime: 60 * 60 * 1000, // 60 минут хранения в кэше
  });
};

// Хук для получения текущего пользователя
export const useUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<User | null> => {
      if (!pb.authStore.isValid) {
        return null;
      }

      const userId = pb.authStore.record?.id;
      if (!userId) {
        return null;
      }

      const user = await pb.collection("users").getOne(userId, {
        expand: "office",
      });

      return user as User;
    },
    staleTime: 10 * 60 * 1000, // 10 минут кэширования
    enabled: pb.authStore.isValid,
  });
};

// Функция для поиска пользователя по нику
export const findUserByNickname = async (nickname: string): Promise<User | null> => {
  try {
    const users = await pb.collection("users").getList(1, 50, {
      filter: `name ~ "${nickname}"`,
      expand: "office",
    });

    if (users.items.length === 0) {
      return null;
    }

    // Если точное совпадение найдено, возвращаем его
    const exactMatch = users.items.find(user => user.name.toLowerCase() === nickname.toLowerCase());
    if (exactMatch) {
      return exactMatch as User;
    }

    // Иначе возвращаем первый подходящий
    return users.items[0] as User;
  } catch (error) {
    console.error("Error finding user by nickname:", error);
    return null;
  }
};

// Вспомогательная функция для получения контрактов
const fetchContractsForLeaderboard = async (
  startDate: Date,
  endDate: Date,
  officeId?: string
): Promise<Contract[]> => {
  const startPbFormat = formatPbDate(startDate);
  const endPbFormat = formatPbDate(endDate);

  let filter = `created >= "${startPbFormat}" && created <= "${endPbFormat}" && is_deleted = false`;

  if (officeId) {
    filter += ` && office = "${officeId}"`;
  }

  const contracts = await pb
    .collection("contracts")
    .getList<Contract>(1, 1000, {
      expand: "office,created_by,created_by.office",
      filter,
      sort: "-created",
    });

  return contracts.items;
};

// Хук для лидерборда менеджеров
export const useManagersLeaderboard = (
  startDate: Date,
  endDate: Date,
  officeId?: string,
  currentUserId?: string
) => {
  // Сначала получаем курсы валют
  const { data: rates, isLoading: ratesLoading } = useExchangeRates();

  // Затем получаем контракты
  const {
    data: contracts,
    isLoading: contractsLoading,
    error: contractsError,
  } = useQuery({
    queryKey: [
      "contracts",
      "managersLeaderboard",
      startDate.getTime(), // Используем timestamp для стабильности
      endDate.getTime(),
      officeId,
    ],
    queryFn: () => fetchContractsForLeaderboard(startDate, endDate, officeId),
    enabled: true, // Всегда включен
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Комбинируем данные в useMemo (без дополнительного запроса!)
  const leaderboard = useMemo(() => {
    if (!contracts || !rates) return [];

    // Группировка по менеджерам
    const managerMap = new Map<string, any>();

    contracts.forEach((contract) => {
      // Строгое правило: нет netto = не считается
      if (contract.netto_price == null || contract.netto_price <= 0) {
        return;
      }

      const managerId = contract.created_by;
      const manager = contract.expand?.created_by;
      if (!manager) return;

      const managerName = manager.name;
      const officeName =
        contract.expand?.["created_by.office"]?.name ||
        manager.expand?.office?.name ||
        "Без офиса";

      const commissionInCurrencies = getCommissionInCurrencies(contract, rates);
      const commissionUSD = commissionInCurrencies.USD;

      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          managerId,
          managerName,
          officeName,
          totalCommissionUSD: 0,
          contractCount: 0,
        });
      }

      const managerData = managerMap.get(managerId);
      managerData.totalCommissionUSD += commissionUSD;
      managerData.contractCount += 1;
    });

    // Сортировка и ранжирование
    const sorted = Array.from(managerMap.values())
      .sort((a, b) => b.totalCommissionUSD - a.totalCommissionUSD)
      .map((manager, index) => ({
        ...manager,
        rank: index + 1,
        isCurrentUser: currentUserId ? manager.managerId === currentUserId : false,
      }));

    // Если данных нет и это текущий месяц (1-3 дня), возвращаем заглушку
    const now = new Date();
    const currentDay = now.getDate();
    const hasRealData = sorted.length > 0;
    const isCurrentMonth = (startDate.getMonth() === now.getMonth() &&
                           startDate.getFullYear() === now.getFullYear());

    if (!hasRealData && isCurrentMonth && currentDay <= 3) {
      // Временные тестовые данные для нового месяца
      const mockData = [
        {
          managerId: "mock-1",
          managerName: "Александр Петров",
          officeName: "Москва",
          totalCommissionUSD: 15420.50,
          contractCount: 12,
          rank: 1,
          isCurrentUser: false,
        },
        {
          managerId: "mock-2",
          managerName: "Мария Сидорова",
          officeName: "Санкт-Петербург",
          totalCommissionUSD: 12350.75,
          contractCount: 10,
          rank: 2,
          isCurrentUser: true,
        },
        {
          managerId: "mock-3",
          managerName: "Дмитрий Иванов",
          officeName: "Москва",
          totalCommissionUSD: 10890.25,
          contractCount: 8,
          rank: 3,
          isCurrentUser: false,
        },
        {
          managerId: "mock-4",
          managerName: "Елена Козлова",
          officeName: "Казань",
          totalCommissionUSD: 9540.00,
          contractCount: 9,
          rank: 4,
          isCurrentUser: false,
        },
        {
          managerId: "mock-5",
          managerName: "Сергей Новиков",
          officeName: "Екатеринбург",
          totalCommissionUSD: 8750.30,
          contractCount: 7,
          rank: 5,
          isCurrentUser: false,
        },
        {
          managerId: "mock-6",
          managerName: "Ольга Морозова",
          officeName: "Новосибирск",
          totalCommissionUSD: 7230.80,
          contractCount: 6,
          rank: 6,
          isCurrentUser: false,
        },
      ];

      return mockData;
    }

    return sorted;
  }, [contracts, rates]);

  return {
    data: leaderboard,
    isLoading: ratesLoading || contractsLoading,
    error: contractsError,
  };
};

// Хук для получения данных конкретного пользователя для периода
export const useUserStats = (
  userId: string,
  startDate: Date,
  endDate: Date,
  userName?: string,
  userOfficeName?: string
) => {
  const { data: rates, isLoading: ratesLoading } = useExchangeRates();

  const {
    data: userStats,
    isLoading: userStatsLoading,
    error: userStatsError,
  } = useQuery({
    queryKey: [
      "userStats",
      userId,
      startDate.getTime(),
      endDate.getTime(),
    ],
    queryFn: async () => {
      if (!userId || !rates) return {
        managerId: userId,
        managerName: userName || "Пользователь",
        officeName: userOfficeName || "Без офиса",
        totalCommissionUSD: 0,
        contractCount: 0,
        rank: 0,
        isCurrentUser: true,
      };

      const startPbFormat = formatPbDate(startDate);
      const endPbFormat = formatPbDate(endDate);

      const filter = `created >= "${startPbFormat}" && created <= "${endPbFormat}" && is_deleted = false && created_by = "${userId}"`;

      const contracts = await pb
        .collection("contracts")
        .getList<Contract>(1, 1000, {
          expand: "created_by,created_by.office",
          filter,
        });

      let totalCommissionUSD = 0;
      let contractCount = 0;
      let foundUser = null;
      let foundOfficeName = userOfficeName || "Без офиса";

      if (contracts.items.length > 0) {
        contracts.items.forEach((contract) => {
          if (contract.netto_price == null || contract.netto_price <= 0) {
            return;
          }

          const commissionInCurrencies = getCommissionInCurrencies(contract, rates);
          totalCommissionUSD += commissionInCurrencies.USD;
          contractCount += 1;
        });

        foundUser = contracts.items[0]?.expand?.created_by;
        foundOfficeName = contracts.items[0]?.expand?.["created_by.office"]?.name || userOfficeName || "Без офиса";
      }

      // Всегда возвращаем данные пользователя, даже если нет контрактов
      return {
        managerId: userId,
        managerName: foundUser?.name || userName || "Пользователь",
        officeName: foundOfficeName,
        totalCommissionUSD,
        contractCount,
        rank: 0, // Будет вычислено позже
        isCurrentUser: true,
      };
    },
    enabled: !!userId && !!rates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    data: userStats,
    isLoading: ratesLoading || userStatsLoading,
    error: userStatsError,
  };
};
