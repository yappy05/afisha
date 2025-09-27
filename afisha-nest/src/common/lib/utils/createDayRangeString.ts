export const createDayRangeString = (dateString: string): string => {
  // Парсим дату из формата MM.DD.YY
  const [month, day, year] = dateString.split('.').map(Number);

  // Преобразуем год в полный формат (20YY)
  const fullYear = 2000 + year;

  // Создаем объект Date (месяц в JS начинается с 0, поэтому month - 1)
  const date = new Date(fullYear, month - 1, day);

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
}