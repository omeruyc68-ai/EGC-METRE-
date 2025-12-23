
import React, { useState, useMemo } from 'react';
import { MetreElement, ProjectData, CalculationResults, ElementType, SlopeUnit, EntryCategory, CalculationGroup } from './types';
import { calculateProject, calculateSlopeFactor } from './utils/geometry';
import { analyzeProjectWithAI } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const App: React.FC = () => {
  const [groups, setGroups] = useState<CalculationGroup[]>([]);
  const [projectInfo, setProjectInfo] = useState({
    name: "Nouveau Projet EGC",
    client: "Client EGC",
  });

  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const results = useMemo(() => calculateProject(groups), [groups]);

  const addGroup = () => {
    const newGroup: CalculationGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Calcul ${groups.length + 1}`,
      elements: []
    };
    setGroups([...groups, newGroup]);
  };

  const removeGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
  };

  const updateGroupName = (id: string, name: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, name } : g));
  };

  const addElement = (groupId: string, category: EntryCategory) => {
    const newEl: MetreElement = {
      id: Math.random().toString(36).substr(2, 9),
      name: category === 'element' ? 'Nouvelle Surface' : 'Nouvel Ancrage',
      category,
      type: category === 'element' ? '3D' : undefined,
      area2d: category === 'element' ? 0 : undefined,
      slopeUnit: category === 'element' ? 'ratio' : undefined,
      slopeValue: category === 'element' ? 2 : undefined,
      anchorageLength: category === 'anchorage' ? 0 : undefined,
      anchorageDevelopedWidth: category === 'anchorage' ? 0.5 : undefined,
      images: []
    };

    setGroups(groups.map(g => g.id === groupId ? { ...g, elements: [...g.elements, newEl] } : g));
  };

  const removeElement = (groupId: string, elementId: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, elements: g.elements.filter(el => el.id !== elementId) } : g));
  };

  const updateElement = (groupId: string, elementId: string, updates: Partial<MetreElement>) => {
    setGroups(groups.map(g => g.id === groupId ? {
      ...g,
      elements: g.elements.map(el => el.id === elementId ? { ...el, ...updates } : el)
    } : g));
  };

  const handleImageUpload = (groupId: string, elementId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setGroups(prev => prev.map(g => g.id === groupId ? {
          ...g,
          elements: g.elements.map(el => el.id === elementId ? { ...el, images: [...el.images, base64String] } : el)
        } : g));
      };
      reader.readAsDataURL(file);
    });
  };

  const triggerAIAnalysis = async () => {
    if (groups.length === 0) return;
    setIsAnalyzing(true);
    const project: ProjectData = { ...projectInfo, groups, results, date: new Date().toLocaleDateString() };
    const analysis = await analyzeProjectWithAI(project);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const exportToExcel = () => {
    const headers = ["Groupe", "Désignation", "Catégorie", "Type", "Surf 2D", "Pente", "ML", "Dév", "Total (m²)"];
    const rows = groups.flatMap(g => g.elements.map(el => {
      const isEl = el.category === 'element';
      const factor = isEl && el.type === '3D' ? calculateSlopeFactor(el.slopeValue || 0, el.slopeUnit || 'ratio') : 1;
      const total = isEl ? (el.area2d || 0) * factor : (el.anchorageLength || 0) * (el.anchorageDevelopedWidth || 0);
      return [
        g.name, el.name, el.category, el.type || '-', el.area2d || '-', 
        isEl ? `${el.slopeValue}${el.slopeUnit === 'ratio' ? ':1' : '%'}` : '-',
        el.anchorageLength || '-', el.anchorageDevelopedWidth || '-', total.toFixed(2)
      ];
    }));
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EGC_${projectInfo.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-[#1e3a8a] text-white border-b-4 border-[#facc15] shadow-lg sticky top-0 z-50 no-print">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded font-black text-[#1e3a8a] text-lg px-3">EGC</div>
             <div>
               <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Galopin</h1>
               <p className="text-[9px] uppercase font-bold text-slate-300 tracking-widest mt-1">Génie Étanchéité</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addGroup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition flex items-center gap-2">
              <i className="fas fa-plus"></i> Nouveau Groupe
            </button>
            <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition flex items-center gap-2">
              <i className="fas fa-file-excel"></i>
            </button>
            <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition flex items-center gap-2">
              <i className="fas fa-file-pdf"></i>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD BAR */}
      <div className="bg-white shadow-sm border-b py-3 no-print">
        <div className="container mx-auto px-4 flex justify-between items-center">
           <div className="flex gap-6">
              <div className="border-l-4 border-[#facc15] pl-3">
                <p className="text-[9px] font-black text-slate-400 uppercase">Surface Totale</p>
                <p className="text-xl font-black text-[#1e3a8a]">{results.totalFinal.toFixed(2)} <small className="text-xs">m²</small></p>
              </div>
              <div className="border-l-4 border-red-600 pl-3">
                <p className="text-[9px] font-black text-slate-400 uppercase">Total Ancrages</p>
                <p className="text-xl font-black text-[#1e3a8a]">{results.totalAnchorage.toFixed(2)} <small className="text-xs">m²</small></p>
              </div>
           </div>
           <button 
             onClick={triggerAIAnalysis}
             disabled={isAnalyzing || groups.length === 0}
             className="bg-[#1e3a8a] text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition disabled:opacity-50"
           >
             {isAnalyzing ? 'Vérification...' : 'Lancer Expertise IA'}
           </button>
        </div>
      </div>

      <main className="flex-1 container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: GROUPS */}
        <div className="lg:col-span-8 space-y-8 no-print">
          {groups.map((group) => {
            const groupRes = results.groups.find(r => r.groupId === group.id);
            return (
              <div key={group.id} className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
                   <div className="flex items-center gap-4 flex-1">
                      <i className="fas fa-layer-group text-slate-400"></i>
                      <input 
                        value={group.name} 
                        onChange={(e) => updateGroupName(group.id, e.target.value)}
                        className="bg-transparent font-black text-slate-800 focus:outline-none border-b-2 border-transparent focus:border-blue-500 text-lg flex-1"
                      />
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Sous-total</p>
                         <p className="text-sm font-black text-blue-600">{groupRes?.total.toFixed(2)} m²</p>
                      </div>
                      <button onClick={() => removeGroup(group.id)} className="text-slate-300 hover:text-red-500 transition px-2">
                        <i className="fas fa-trash"></i>
                      </button>
                   </div>
                </div>

                <div className="p-6 space-y-4">
                  {group.elements.map((el) => (
                    <div key={el.id} className={`p-4 rounded-xl border-l-4 shadow-sm transition ${el.category === 'element' ? 'border-blue-500 bg-blue-50/20' : 'border-amber-500 bg-amber-50/20'}`}>
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Désignation</label>
                          <input 
                            value={el.name} 
                            onChange={(e) => updateElement(group.id, el.id, { name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold"
                          />
                        </div>

                        {el.category === 'element' ? (
                          <>
                            <div className="w-24">
                              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Type</label>
                              <select 
                                value={el.type} 
                                onChange={(e) => updateElement(group.id, el.id, { type: e.target.value as ElementType })}
                                className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold"
                              >
                                <option value="2D">PLAT</option>
                                <option value="3D">TALUS</option>
                              </select>
                            </div>
                            <div className="w-24">
                              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Surf. 2D</label>
                              <input 
                                type="number" 
                                value={el.area2d} 
                                onChange={(e) => updateElement(group.id, el.id, { area2d: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold"
                              />
                            </div>
                            {el.type === '3D' && (
                              <div className="w-24">
                                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Pente</label>
                                <input 
                                  type="number" 
                                  value={el.slopeValue} 
                                  onChange={(e) => updateElement(group.id, el.id, { slopeValue: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-white border-2 border-blue-200 rounded p-2 text-xs font-black text-blue-600"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="w-32">
                              <label className="text-[8px] font-black text-amber-600 uppercase block mb-1">Linéaire (ml)</label>
                              <input 
                                type="number" 
                                value={el.anchorageLength} 
                                onChange={(e) => updateElement(group.id, el.id, { anchorageLength: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-amber-200 rounded p-2 text-xs font-bold text-amber-700"
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-[8px] font-black text-amber-600 uppercase block mb-1">Dév (m)</label>
                              <input 
                                type="number" 
                                value={el.anchorageDevelopedWidth} 
                                onChange={(e) => updateElement(group.id, el.id, { anchorageDevelopedWidth: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border border-amber-200 rounded p-2 text-xs font-bold text-amber-700"
                              />
                            </div>
                          </>
                        )}

                        <div className="flex gap-2 items-center self-center pl-4 border-l">
                           <label className="cursor-pointer text-slate-300 hover:text-blue-500 transition">
                             <i className="fas fa-camera text-lg"></i>
                             <input type="file" className="hidden" multiple onChange={(e) => handleImageUpload(group.id, el.id, e)} />
                           </label>
                           <button onClick={() => removeElement(group.id, el.id)} className="text-slate-300 hover:text-red-500 transition">
                             <i className="fas fa-times-circle"></i>
                           </button>
                        </div>
                      </div>

                      {el.images.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                           {el.images.map((img, i) => (
                             <img key={i} src={img} className="w-10 h-10 object-cover rounded border shadow-sm" alt="preuve" />
                           ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4 border-t border-dashed">
                    <button 
                      onClick={() => addElement(group.id, 'element')}
                      className="flex-1 border-2 border-dashed border-blue-200 py-3 rounded-xl text-[10px] font-black text-blue-400 uppercase hover:bg-blue-50 hover:border-blue-400 transition"
                    >
                      <i className="fas fa-vector-square mr-2"></i> Ajouter Surface
                    </button>
                    <button 
                      onClick={() => addElement(group.id, 'anchorage')}
                      className="flex-1 border-2 border-dashed border-amber-200 py-3 rounded-xl text-[10px] font-black text-amber-500 uppercase hover:bg-amber-50 hover:border-amber-400 transition"
                    >
                      <i className="fas fa-arrows-left-right mr-2"></i> Ajouter Ancrage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="py-32 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <i className="fas fa-calculator text-4xl text-slate-200"></i>
               </div>
               <h2 className="text-xl font-black text-slate-800 uppercase italic">Prêt pour un nouveau métré ?</h2>
               <p className="text-slate-400 text-sm mt-2 font-medium">Créez votre premier groupe de calcul pour commencer.</p>
               <button onClick={addGroup} className="mt-8 bg-[#1e3a8a] text-white px-10 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:scale-110 transition shadow-xl">
                 C'est parti !
               </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: REPORT & SUMMARY */}
        <div className="lg:col-span-4 space-y-8 no-print">
          <div className="bg-[#1e3a8a] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <i className="fas fa-shield-alt text-8xl"></i>
             </div>
             <h2 className="text-sm font-black text-[#facc15] uppercase tracking-[0.2em] mb-6">Consolidé Technique</h2>
             <div className="space-y-6 relative z-10">
                <div>
                   <p className="text-[10px] font-black uppercase text-blue-300 mb-1">Surface Totale Étanchéité</p>
                   <p className="text-4xl font-black">{results.totalFinal.toFixed(2)} m²</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-blue-900/50 p-4 rounded-2xl border border-blue-700">
                      <p className="text-[9px] font-black uppercase text-blue-400">Surfaces</p>
                      <p className="text-xl font-bold">{results.totalArea.toFixed(1)} <small className="text-[10px]">m²</small></p>
                   </div>
                   <div className="bg-blue-900/50 p-4 rounded-2xl border border-blue-700">
                      <p className="text-[9px] font-black uppercase text-blue-400">Ancrages</p>
                      <p className="text-xl font-bold">{results.totalAnchorage.toFixed(1)} <small className="text-[10px]">m²</small></p>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white border-2 border-slate-900 p-6 rounded-3xl shadow-xl min-h-[400px] flex flex-col">
             <h2 className="text-sm font-black text-slate-800 uppercase italic mb-6 border-b pb-4 flex justify-between items-center">
               <span>Expertise EGC IA</span>
               <i className="fas fa-robot text-[#1e3a8a]"></i>
             </h2>
             <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-slate-600 font-medium">
                {isAnalyzing ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="animate-pulse font-black uppercase text-[10px] text-blue-600">Calcul en cours...</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="whitespace-pre-wrap">{aiAnalysis}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <i className="fas fa-lightbulb text-4xl mb-4"></i>
                    <p className="uppercase font-black text-[10px] tracking-widest leading-normal">
                      L'IA analysera vos groupes pour valider la faisabilité technique.
                    </p>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* PRINT ONLY: Professional Report */}
        <div className="print-only fixed inset-0 bg-white p-12 text-slate-900 z-[1000]">
           <div className="flex justify-between items-start border-b-4 border-[#1e3a8a] pb-8 mb-8">
              <div>
                 <h1 className="text-5xl font-black text-[#1e3a8a] uppercase tracking-tighter">Métré Technique</h1>
                 <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-sm mt-1">EGC Galopin — Génie Étanchéité</p>
                 <div className="mt-8 grid grid-cols-2 gap-10">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Chantier</p>
                       <p className="font-black text-lg">{projectInfo.name}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Client</p>
                       <p className="font-black text-lg">{projectInfo.client}</p>
                    </div>
                 </div>
              </div>
              <div className="text-right">
                 <div className="text-4xl font-black text-[#1e3a8a] border-4 border-[#1e3a8a] px-6 py-2 mb-2">EGC</div>
                 <p className="text-xs font-bold text-slate-400">RAPPORT OFFICIEL</p>
              </div>
           </div>

           {groups.map((g, idx) => {
             const gRes = results.groups.find(r => r.groupId === g.id);
             return (
               <div key={g.id} className="mb-10 page-break">
                  <h2 className="text-xl font-black text-[#1e3a8a] uppercase bg-slate-50 p-3 border-l-8 border-[#facc15] mb-4">
                    {idx + 1}. {g.name}
                  </h2>
                  <table className="w-full text-left text-xs mb-4">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase font-black">
                        <th className="p-3">Désignation</th>
                        <th className="p-3">Catégorie</th>
                        <th className="p-3 text-right">Détails</th>
                        <th className="p-3 text-right">Surface (m²)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                      {g.elements.map(el => {
                        const isEl = el.category === 'element';
                        const factor = isEl && el.type === '3D' ? calculateSlopeFactor(el.slopeValue || 0, el.slopeUnit || 'ratio') : 1;
                        const total = isEl ? (el.area2d || 0) * factor : (el.anchorageLength || 0) * (el.anchorageDevelopedWidth || 0);
                        return (
                          <tr key={el.id}>
                            <td className="p-3 font-bold">{el.name}</td>
                            <td className="p-3 uppercase text-[10px] font-black text-slate-400">{el.category === 'element' ? 'Surface' : 'Ancrage'}</td>
                            <td className="p-3 text-right">
                               {isEl ? `${el.area2d}m² (${el.type})` : `${el.anchorageLength}ml x ${el.anchorageDevelopedWidth}m`}
                            </td>
                            <td className="p-3 text-right font-black">{total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                       <tr className="bg-blue-50 font-black">
                         <td colSpan={3} className="p-3 text-right uppercase text-[10px]">Total {g.name}</td>
                         <td className="p-3 text-right text-blue-700">{gRes?.total.toFixed(2)} m²</td>
                       </tr>
                    </tfoot>
                  </table>
               </div>
             );
           })}

           <div className="mt-20 border-t-4 border-slate-900 pt-10">
              <div className="grid grid-cols-2 gap-10">
                 <div className="bg-slate-900 text-white p-8 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Récapitulatif Général</p>
                    <p className="text-5xl font-black">{results.totalFinal.toFixed(2)} <small className="text-xl">m²</small></p>
                    <div className="mt-6 flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                       <span>Surfaces: {results.totalArea.toFixed(2)} m²</span>
                       <span>Ancrages: {results.totalAnchorage.toFixed(2)} m²</span>
                    </div>
                 </div>
                 <div className="border-2 border-dashed border-slate-200 p-8 rounded-2xl flex flex-col justify-between italic text-slate-400 text-sm">
                    <p>Visa Expert EGC Galopin :</p>
                    <div className="h-20 border-b border-slate-100"></div>
                 </div>
              </div>
           </div>
        </div>
      </main>

      <footer className="bg-[#1e3a8a] py-8 border-t-4 border-[#facc15] no-print">
        <div className="container mx-auto px-4 flex justify-between items-center text-white">
          <div className="font-black italic text-xl">EGC GALOPIN</div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Solution Certifiée v2.5.0</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
