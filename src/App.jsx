import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Инициализируем клиент Supabase с использованием переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  // Состояния для данных из БД
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Состояния шагов формы записи
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Статусы отправки
  const [issubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Генерируем массив доступных дат (на 7 дней вперед)
  const [availableDates, setAvailableDates] = useState([]);
  // Доступные временные слоты для записи
  const timeSlots = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "19:00"];

  useEffect(() => {
    // 1. Подтягиваем список СТО из Supabase при загрузке приложения
    async function fetchShops() {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('id, name, city, specialization');
        if (error) throw error;
        setShops(data || []);
      } catch (err) {
        console.error("Ошибка загрузки СТО:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShops();

    // 2. Генерируем даты для календаря формата "ДД.ММ.ГГГГ"
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

    // 3. Интеграция с Telegram WebApp (расширяем на весь экран)
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedShop || !selectedDate || !selectedTime || !name || !phone) {
      alert("Пожалуйста, заполните все шаги записи!");
      return;
    }

    setIsSubmitting(true);
    
    // Получаем ID пользователя прямо из Telegram, если открыто в мессенджере
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const userId = tgUser ? tgUser.id : 0;

    const dateTimeStr = `${selectedDate} ${selectedTime}`;

    try {
      // Сохраняем запись напрямую в облачную базу данных Supabase
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
      
      // Отправляем сигнал боту, что запись успешна (закроет Mini App)
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify({ 
          status: "success", 
          shop: selectedShop.name, 
          datetime: dateTimeStr 
        }));
      }
    } catch (err) {
      alert("Ошибка отправки данных: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция генерации ссылки на Google Календарь для финального экрана
  const getGoogleLink = () => {
    if (!selectedShop) return '#';
    const [datePart, timePart] = `${selectedDate} ${selectedTime}`.split(' ');
    const [day, month, year] = datePart.split('.');
    const [hours, minutes] = timePart.split(':');
    const dt = new Date(year, month - 1, day, hours, minutes);
    
    const formatToUTC = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const gStart = formatToUTC(dt);
    const gEnd = formatToUTC(new Date(dt.getTime() + 60 * 60 * 1000)); // +1 час

    const baseUrl = "https://google.com";
    return `${baseUrl}&text=${encodeURIComponent(`Запись на СТО: ${selectedShop.name}`)}&dates=${gStart}/${gEnd}&location=${encodeURIComponent(selectedShop.city)}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-slate-400 font-medium">Загрузка автосервисов...</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-center border border-slate-800 shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-3xl">✓</div>
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">Вы успешно записаны!</h2>
          <p className="text-slate-400 mb-6">Ждем вас в филиале **{selectedShop.name}** ({selectedShop.city}) <br /> **{selectedDate}** в **{selectedTime}**.</p>
          <a href={getGoogleLink()} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-center font-bold text-white transition-all shadow-lg">
            🗓️ Добавить в мой Google Календарь
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      <div className="mx-auto max-w-md space-y-6">
        
        {/* Шапка */}
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Онлайн-запись СТО</h1>
          <p className="text-sm text-slate-400">Выберите филиал и удобное время</p>
        </header>

        {/* Шаг 1: Выбор СТО */}
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Выберите СТО</label>
          <div className="grid grid-cols-1 gap-2">
            {shops.map(shop => (
              <button key={shop.id} onClick={() => setSelectedShop(shop)} className={`flex flex-col rounded-xl border p-4 text-left transition-all ${selectedShop?.id === shop.id ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                <span className="font-bold text-slate-100">{shop.name}</span>
                <span className="text-xs text-slate-400 mt-1">{shop.city} • {shop.specialization}</span>
              </button>
            ))}
          </div>
        </section>

        {selectedShop && (
          <>
            {/* Шаг 2: Календарь дат */}
            <section className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Выберите дату визита</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {availableDates.map(date => (
                  <button key={date} onClick={() => { setSelectedDate(date); setSelectedTime(''); }} className={`flex-shrink-0 rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all border ${selectedDate === date ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
                    {date.split('.')[0]}.{date.split('.')[1]}
                  </button>
                ))}
              </div>
            </section>

            {/* Шаг 3: Временные слоты */}
            {selectedDate && (
              <section className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Доступное время</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => (
                    <button key={time} onClick={() => setSelectedTime(time)} className={`rounded-xl py-2.5 text-center text-xs font-bold transition-all border ${selectedTime === time ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'}`}>
                      {time}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Шаг 4: Личные данные */}
            {selectedTime && (
              <form onSubmit={handleBooking} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-md">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">4. Контактные данные</label>
                <input type="text" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors" />
                <input type="tel" placeholder="+7 (999) 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors" />

