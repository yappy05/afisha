export const createDayRangeString = (date: Date): string => {
  // Создаем начало дня (00:00:00)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // Создаем конец дня (23:59:59)
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Функция для форматирования одной даты
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}%3A${minutes}%3A${seconds}%2B03%3A00`;
  };

  const startFormatted = formatDate(startOfDay);
  const endFormatted = formatDate(endOfDay);

  return `${startFormatted}%2C${endFormatted}`;
};
