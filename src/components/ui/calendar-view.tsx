"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface CalendarViewProps {
  activeDates: string[]; // Array of YYYY-MM-DD dates that contain memories
  onDateSelect: (dateString: string) => void;
  selectedDate?: string | null;
}

export function CalendarView({ activeDates, onDateSelect, selectedDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Name of month list
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days of week
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of week index for the 1st of current month (0: Sunday, etc.)
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate date grid items
  const calendarCells = [];

  // Add empty placeholders for days from previous month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }

  // Add days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d));
  }

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-3xl p-4.5 premium-shadow-sm select-none">
      
      {/* Header controls */}
      <div className="flex items-center justify-between pb-3.5 border-b border-neutral-50 dark:border-neutral-900/60 mb-3.5">
        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-neutral-850 dark:text-neutral-200">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-neutral-850 dark:hover:text-white transition-colors cursor-pointer outline-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-neutral-850 dark:hover:text-white transition-colors cursor-pointer outline-none"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Week day names */}
      <div className="grid grid-cols-7 gap-y-2 text-center mb-1">
        {daysOfWeek.map((day) => (
          <span key={day} className="text-[9px] font-semibold font-mono text-neutral-400 uppercase">
            {day}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1.5 text-center">
        {calendarCells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="w-8 h-8" />;
          }

          const dayNum = date.getDate();
          // Format date as YYYY-MM-DD
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const dayStr = String(dayNum).padStart(2, "0");
          const dateString = `${date.getFullYear()}-${monthStr}-${dayStr}`;

          const isActive = activeDates.includes(dateString);
          const isSelected = selectedDate === dateString;
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <button
              key={dateString}
              type="button"
              onClick={() => onDateSelect(dateString)}
              className={`w-8 h-8 rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all relative cursor-pointer outline-none ${
                isSelected
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 scale-105 font-bold shadow-sm"
                  : isToday
                  ? "border border-neutral-950 dark:border-white text-neutral-950 dark:text-white font-semibold"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              }`}
            >
              <span>{dayNum}</span>
              {/* Highlight dot if date contains memories and is not currently selected */}
              {isActive && !isSelected && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${
                  isToday ? "bg-neutral-950 dark:bg-white" : "bg-neutral-400 dark:bg-neutral-600"
                }`} />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
