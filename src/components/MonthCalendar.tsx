import React, { useState } from "react";

interface MonthCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isLoading?: boolean;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  selectedDate,
  onDateChange,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(selectedDate.getFullYear(), monthIndex, 1);
    onDateChange(newDate);
    setIsExpanded(false);
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, selectedDate.getMonth(), 1);
    onDateChange(newDate);
  };

  const getMonthDisplayName = (date: Date) => {
    return months[date.getMonth()];
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  };

  return (
    <div className="bg-white/80 rounded-lg shadow-md overflow-hidden">
      <div
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="text-xs text-gray-500">Период данных</div>
          <div className="text-sm font-semibold text-gray-800">
            {getMonthDisplayName(selectedDate)} {selectedDate.getFullYear()}
          </div>
          {isCurrentMonth() && (
            <div className="text-xs text-green-600 font-medium">
              Текущий месяц
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
          <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-3">
          {/* Год */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Год
            </label>
            <div className="flex gap-1">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => handleYearSelect(year)}
                  className={`flex-1 py-1 px-2 text-xs rounded ${
                    selectedDate.getFullYear() === year
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Месяцы */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">
              Месяц
            </label>
            <div className="grid grid-cols-3 gap-1">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={`py-2 px-1 text-xs rounded ${
                    selectedDate.getMonth() === index
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Быстрый выбор */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => {
                const now = new Date();
                onDateChange(new Date(now.getFullYear(), now.getMonth(), 1));
                setIsExpanded(false);
              }}
              className="w-full py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              📅 Текущий месяц
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
