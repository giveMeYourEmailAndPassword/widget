import React from "react";

interface MotivationElementsProps {
  rank: number;
  totalCommissionUSD: number;
  contractCount: number;
  isCurrentUser: boolean;
}

export const MotivationElements: React.FC<MotivationElementsProps> = ({
  rank,
}) => {
  const getMotivationalMessage = (rank: number) => {
    switch (rank) {
      case 1:
        return "🔥 Чемпион!";
      case 2:
        return "💪 Почти цель!";
      case 3:
        return "🎯 Отлично!";
      case 4:
      case 5:
        return "📈 Топ-5!";
      default:
        return "🚀 Вперёд!";
    }
  };

  return (
    <div>
      {rank <= 3 && (
        <div className="text-xs">
          <span className="font-medium text-gray-700">
            {getMotivationalMessage(rank)}
          </span>
        </div>
      )}
    </div>
  );
};