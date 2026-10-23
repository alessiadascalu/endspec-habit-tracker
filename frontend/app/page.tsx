"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [me, setMe] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [type, setType] = useState("one-off");
  const [dueDate, setDueDate] = useState("");

  const API_URL = "http://localhost:3001";

  const fetchData = async () => {
    try {
      const [resMe, resQuests, resCompletions] = await Promise.all([
        fetch(`${API_URL}/me`).then(r => r.json()),
        fetch(`${API_URL}/quests`).then(r => r.json()),
        fetch(`${API_URL}/completions`).then(r => r.json())
      ]);
      setMe(resMe);
      setQuests(resQuests);
      setCompletions(resCompletions);
    } catch (e) {
      console.error("Eroare la conectarea cu serverul", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createQuest = async (e: any) => {
    e.preventDefault();
    const body: any = { title, difficulty };
    if (type === "daily") body.recurrence = "daily";
    if (type === "one-off" && dueDate) body.due_date = dueDate;

    await fetch(`${API_URL}/quests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    setTitle("");
    setDueDate("");
    fetchData();
  };

  const completeQuest = async (id: string) => {
    await fetch(`${API_URL}/quests/${id}/complete`, { method: "POST" });
    fetchData();
  };

  const undoCompletion = async (id: string) => {
    await fetch(`${API_URL}/completions/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (!me) return <div className="p-10 text-center text-white">Se incarca... Daca dureaza mult, asigura-te ca serverul backend merge.</div>;

  const xpPercent = (me.xp_into_level / (me.xp_into_level + me.xp_to_next_level)) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header - Bara de XP si Nivel */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Nivel {me.level}</h1>
              <p className="text-slate-400">Total: {me.xp} XP</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-500">🔥 {me.streak} Zile</div>
              <p className="text-slate-400 text-sm">Streak curent</p>
            </div>
          </div>
          
          <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden relative">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${xpPercent}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
              {me.xp_into_level} / {me.xp_into_level + me.xp_to_next_level} XP
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formular Adaugare Misiune */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-fit">
            <h2 className="text-xl font-bold text-white mb-4">Misiune Noua</h2>
            <form onSubmit={createQuest} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Titlu</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Ex: Bea 2 litri de apa" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Dificultate</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="easy">Usor (10 XP)</option>
                    <option value="medium">Mediu (25 XP)</option>
                    <option value="hard">Greu (50 XP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tip</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="one-off">O singura data</option>
                    <option value="daily">Zilnic</option>
                  </select>
                </div>
              </div>

              {type === "one-off" && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Data limita (optional)</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
                Adauga Misiunea
              </button>
            </form>
          </div>

          {/* Lista Misiuni Active */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Misiunile Mele</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {quests.length === 0 && <p className="text-slate-400">Nicio misiune activa.</p>}
              {quests.map(q => (
                <div key={q.id} className={`p-4 rounded-xl border ${q.done ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-slate-750 border-slate-600 shadow-md'} flex justify-between items-center`}>
                  <div>
                    <h3 className={`font-bold ${q.done ? 'line-through text-slate-400' : 'text-white'}`}>{q.title}</h3>
                    <div className="flex gap-2 text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded-full ${q.difficulty === 'hard' ? 'bg-red-900 text-red-200' : q.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'}`}>
                        {q.difficulty}
                      </span>
                      {q.recurrence === 'daily' && <span className="px-2 py-0.5 rounded-full bg-blue-900 text-blue-200">zilnic</span>}
                      {q.due_date && <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">Pana la: {q.due_date}</span>}
                    </div>
                  </div>
                  {!q.done && (
                    <button onClick={() => completeQuest(q.id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                      Terminat
                    </button>
                  )}
                  {q.done && <span className="text-green-500 font-bold">✔</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Istoric Finalizari */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Activitati Recente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="pb-3 font-medium">Misiune ID</th>
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">XP Primit</th>
                  <th className="pb-3 font-medium text-right">Actiune</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {completions.length === 0 && <tr><td colSpan={4} className="py-4 text-slate-400 text-center">Fara activitate recenta.</td></tr>}
                {completions.map(c => (
                  <tr key={c.id} className="hover:bg-slate-750">
                    <td className="py-3 text-white">{c.quest_id}</td>
                    <td className="py-3 text-slate-400">{c.day}</td>
                    <td className="py-3 text-green-400 font-bold">+{c.base_xp} XP</td>
                    <td className="py-3 text-right">
                      <button onClick={() => undoCompletion(c.id)} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold tracking-wider">
                        Anuleaza (Undo)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}