import React from "react";

interface MedalProps {
  rank: number;
  size?: "small" | "medium" | "large";
}

export const Medal: React.FC<MedalProps> = ({ rank, size = "medium" }) => {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  const textSize = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-lg",
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-400 to-yellow-600 shadow-yellow-200";
      case 2:
        return "from-gray-300 to-gray-500 shadow-gray-200";
      case 3:
        return "from-orange-300 to-orange-500 shadow-orange-200";
      default:
        return "from-gray-200 to-gray-300 shadow-gray-100";
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return rank;
    }
  };

  if (rank > 3) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 ${textSize[size]}`}
      >
        {rank}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getMedalColor(
      rank
    )} flex items-center justify-center text-white font-bold ${textSize[size]} shadow-md`}>
      <span>{getMedalEmoji(rank)}</span>
    </div>
  );
};