import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // Данные пользователя Telegram
  const [tgUser, setTgUser] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [issubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  const timeSlots = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "19:00"];

  useEffect(() => {
    // Надежная инициализация Telegram WebApp
    const tgContainer = window.Telegram?.WebApp;
    
    if (tgContainer) {
      tgContainer.ready();
      tgContainer.expand(); // Расширяем на весь экран смартфона
      
      // Вытаскиваем безопасные данные
      const user = tgContainer.initDataUnsafe?.user;
      
      if (user) {
        setTgUser(user);
        // Автоматически заполняем поле Имя
        const fullName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        setName(fullName);
      } else {
        // Если зашли из ТГ, но объект user почему-то пустой
        console.log("Telegram WebApp запущен, но данные пользователя скрыты настройками приватности.");
      }
    } else {
      // Лог для теста в обычном браузере вне Телеграма
      console.log("Приложение запущено вне мессенджера Telegram.");
    }

    // Подтягиваем автосервисы из базы Supabase
    async function fetchShops() {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('id, name, city, specialization');
        if (error) throw error;
        setShops(data || []);
      } catch (err) {
        console.error("Ошибка Supabase:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShops();

    // Генерация дат
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      dates.push(`${day}.${month}.${year}`);
    }
    setAvailableDates(dates);
  }, []);


  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedShop || !selectedDate || !selectedTime || !name || !phone) return;

    setIsSubmitting(true);
    const userId = tgUser ? tgUser.id : 0;
    const dateTimeStr = `${selectedDate} ${selectedTime}`;

    try {
      const { error } = await supabase
        .from('appointments')
        .insert([
          {
            shop_id: selectedShop.id,
            user_id: userId,
            date_time: dateTimeStr,
            name: name,
            phone: phone,
            google_event_id: 'TMA_BOOKING'
          }
        ]);

      if (error) throw error;
      setIsSuccess(true);
      
      // Отправляем данные обратно в бота (кнопка закроется, бот получит JSON)
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify({ 
          event: "new_booking",
          shop_name: selectedShop.name,
          date_time: dateTimeStr,
          client_name: name,
          client_phone: phone
        }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-white bg-slate-950 min-h-screen">Загрузка приложения СТО...</div>;
  }

  if (isSuccess) {
    return (
      <div className="p-6 text-center text-white bg-slate-950 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-sm p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <h2 className="text-xl font-bold text-emerald-400">🎉 Запись оформлена!</h2>
          <p className="text-slate-400 mt-2">Ждем вас в {selectedShop.name}</p>
          <p className="text-emerald-400 font-mono mt-1">{selectedDate} в {selectedTime}</p>
          <p className="text-xs text-slate-500 mt-4">Вы можете закрыть это окно. Бот пришлет вам подтверждение.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="text-center">
          {tgUser && <p className="text-xs text-emerald-400 mb-1">Привет, {tgUser.first_name}! 👋</p>}
          <h1 className="text-xl font-bold text-slate-100">Онлайн-запись в автосервис</h1>
        </header>

        <section className="space-y-2">
          <label className="text-xs text-slate-400 block uppercase tracking-wider">1. Выберите филиал СТО</label>
          {shops.map(shop => (
            <button 
              key={shop.id} 
              onClick={() => setSelectedShop(shop)} 
              className={`w-full p-4 text-left rounded-xl border transition-all ${selectedShop?.id === shop.id ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-800 bg-slate-900'}`}
            >
              <div className="font-bold">{shop.name}</div>
              <div className="text-xs text-slate-400">{shop.city} • {shop.specialization}</div>
            </button>
          ))}
        </section>

        {selectedShop && (
          <>
            <section className="space-y-2">
              <label className="text-xs text-slate-400 block uppercase tracking-wider">2. Выберите дату</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableDates.map(date => {
                  const dayStr = date.split('[')[0]; // Защита от старых багов строк
                  return (
                    <button 
                      key={date} 
                      onClick={() => { setSelectedDate(date); setSelectedTime(''); }} 
                      className={`px-4 py-2 rounded-xl border flex-shrink-0 ${selectedDate === date ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-slate-800'}`}
                    >
                      {dayStr.substring(0, 5)}
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedDate && (
              <section className="space-y-2">
                <label className="text-xs text-slate-400 block uppercase tracking-wider">3. Выберите время</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => (
                    <button 
                      key={time} 
                      onClick={() => setSelectedTime(time)} 
                      className={`p-2 text-xs rounded-xl border text-center font-bold ${selectedTime === time ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-slate-800'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {selectedTime && (
              <form onSubmit={handleBooking} className="space-y-3 p-4 bg-slate-900 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-400 block uppercase tracking-wider">4. Контактные данные</label>
                
                <input 
                  type="text" 
                  placeholder="Ваше имя" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white outline-none focus:border-emerald-500" 
                />
                
                <input 
                  type="tel" 
                  placeholder="Номер телефона" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white outline-none focus:border-emerald-500" 
                />
                
                <button 
                  type="submit" 
                  disabled={issubmitting} 
                  className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 text-sm hover:bg-emerald-600 transition-colors"
                >
                  {issubmitting ? "Оформление..." : "Подтвердить запись"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

