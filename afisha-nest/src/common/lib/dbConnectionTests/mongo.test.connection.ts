import { Model } from 'mongoose';
import { EventDocument } from '../shemas/event.shema';

export const testMongoConnection = async (eventModel: Model<EventDocument>) =>
{
  try {
    const count = await eventModel.findOne();
    console.log('✅ MongoDB подключение. Всего документов:', count);

    // Вариант 3: Создание тестового документа и удаление
    const testDoc = await eventModel.create({
      city: 'test',
      category: 'test',
      formattedDate: new Date().toISOString(),
      // добавьте обязательные поля вашей модели
    });

    console.log('✅ Тестовый документ создан:', testDoc._id);

    // Удаляем тестовый документ
    // await eventModel.findByIdAndDelete(testDoc._id);
    // console.log('✅ Тестовый документ удален')
  } catch (error) {
    console.error('❌ Ошибка MongoDB:', error);
  }
}