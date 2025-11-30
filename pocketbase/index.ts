import PocketBase from "pocketbase";

const pb = new PocketBase(
  import.meta.env.VITE_APP_URL ||
    "https://striking-wisdom-production.up.railway.app/"
);

// Отключаем авто-отмену запросов для работы с TanStack Query
pb.autoCancellation(false);

// Функция для автоматической авторизации
export const loginToPocketBase = async () => {
  try {
    // Если пользователь уже авторизован, пропускаем
    if (pb.authStore.isValid) {
      return pb.authStore.record;
    }

    // Захардкоженные учетные данные
    const email = "almazbek@krugosvet.kg";
    const password = "su4kapidr19";

    // Авторизация
    const authData = await pb
      .collection("users")
      .authWithPassword(email, password);
    console.log("Successfully logged in as:", authData.record.email);
    return authData.record;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

// Функция для разлогина
export const logoutFromPocketBase = () => {
  pb.authStore.clear();
  console.log("Logged out from PocketBase");
};

export default pb;
