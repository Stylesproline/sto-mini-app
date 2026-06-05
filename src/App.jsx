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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [issubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  const timeSlots = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "19:00"];

  useEffect(() => {
    async function fetchShops() {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('id, name, city, specialization');
        if (error) throw error;
        setShops(data || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShops();

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

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedShop || !selectedDate || !selectedTime || !name || !phone) return;

    setIsSubmitting(true);
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
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
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify({ status: "success" }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-white">Загрузка...</div>;
  }

  if (isSuccess) {
    return (
      <div className="p-6 text-center text-white bg-slate-950 min-h-screen">
        <h2 className="text-xl font-bold text-emerald-400">Вы успешно записаны!</h2>
        <p className="text-slate-400 mt-2">{selectedDate} в {selectedTime}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="text-center">
          <h1 className="text-xl font-bold text-emerald-400">Онлайн-запись СТО</h1>
        </header>

        <section className="space-y-2">
          <label className="text-xs text-slate-400 block">1. ВЫБЕРИТЕ СТО</label>
          {shops.map(shop => (
            <button 
              key={shop.id} 
              onClick={() => setSelectedShop(shop)} 
              className={`w-full p-4 text-left rounded-xl border ${selectedShop?.id === shop.id ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-800 bg-slate-900'}`}
            >
              <div className="font-bold">{shop.name}</div>
              <div className="text-xs text-slate-400">{shop.city}</div>
            </button>
          ))}
        </section>

        {selectedShop && (
          <>
            <section className="space-y-2">
              <label className="text-xs text-slate-400 block">2. ВЫБЕРИТЕ ДАТУ</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableDates.map(date => {
                  const parts = date.split('.');
                  return (
                    <button 
                      key={date} 
                      onClick={() => { setSelectedDate(date); setSelectedTime(''); }} 
                      className={`px-4 py-2 rounded-xl border ${selectedDate === date ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border-slate-800'}`}
                    >
                      {parts[0]}.{parts[1]}
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedDate && (
              <section className="space-y-2">
                <label className="text-xs text-slate-400 block">3. ВЫБЕРИТЕ ВРЕМЯ</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => (
                    <button 
                      key={time} 
                      onClick={() => setSelectedTime(time)} 
                      className={`p-2 text-xs rounded-xl border ${selectedTime === time ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border-slate-800'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {selectedTime && (
              <form onSubmit={handleBooking} className="space-y-3 p-4 bg-slate-900 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-400 block">4. ДАННЫЕ ДЛЯ ЗАПИСИ</label>
                
                <input 
                  type="text" 
                  placeholder="Ваше имя" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white" 
                />
                
                <input 
                  type="tel" 
                  placeholder="Номер телефона" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white" 
                />
                
                <button 
                  type="submit" 
                  disabled={issubmitting} 
                  className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 text-sm"
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

