import { useState } from 'react';

interface DateRangeCalendarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  unavailableDates?: string[]; // Liste des dates indisponibles au format YYYY-MM-DD
  /** Appelé à toute interaction (tap, click, navigation mois) pour masquer le bouton sticky mobile */
  onInteraction?: () => void;
}

export default function DateRangeCalendar({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  unavailableDates = [],
  onInteraction
}: DateRangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const isDateInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(year, month, day);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const isDateSelected = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === startDate || dateStr === endDate;
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    // Désactiver les dates passées et les dates indisponibles
    return date < today || unavailableDates.includes(dateStr);
  };

  const handleDateClick = (day: number) => {
    onInteraction?.();
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];

    // Empêcher la sélection si la date est désactivée ou indisponible
    if (isDateDisabled(day) || unavailableDates.includes(dateStr)) return;

    if (!startDate || (startDate && endDate)) {
      // Nouvelle sélection : définir la date de début
      onStartDateChange(dateStr);
      onEndDateChange('');
    } else if (startDate && !endDate) {
      // Sélectionner la date de fin
      const start = new Date(startDate);
      if (date < start) {
        // Si la date sélectionnée est avant le début, remplacer le début
        onStartDateChange(dateStr);
        onEndDateChange('');
      } else {
        onEndDateChange(dateStr);
      }
    }
  };

  const goToPreviousMonth = () => {
    onInteraction?.();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    onInteraction?.();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const days = [];
  
  // Jours vides au début du mois
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Jours du mois
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      onPointerDown={onInteraction}
    >
      {/* En-tête du calendrier */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
        >
          <i className="ri-arrow-left-s-line text-xl text-gray-600"></i>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
        >
          <i className="ri-arrow-right-s-line text-xl text-gray-600"></i>
        </button>
      </div>

      {/* Noms des jours */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square"></div>;
          }

          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          const disabled = isDateDisabled(day);
          const selected = isDateSelected(day);
          const inRange = isDateInRange(day);
          const isStart = dateStr === startDate;
          const isEnd = dateStr === endDate;
          const isUnavailable = unavailableDates.includes(dateStr);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={disabled || isUnavailable}
              className={`
                aspect-square text-sm font-medium rounded-lg transition-all
                ${disabled || isUnavailable
                  ? 'text-gray-300 cursor-not-allowed bg-gray-100' 
                  : selected
                  ? 'bg-teal-600 text-white font-semibold'
                  : inRange
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
                ${isStart ? 'rounded-r-none' : ''}
                ${isEnd ? 'rounded-l-none' : ''}
                ${inRange && !selected ? 'rounded-none' : ''}
              `}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-teal-50 rounded"></div>
          <span>Dates disponibles</span>
        </div>
        {unavailableDates.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span>Indisponible</span>
          </div>
        )}
      </div>
    </div>
  );
}
