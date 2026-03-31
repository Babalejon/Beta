import React, { useState, useEffect } from 'react';
import { fetchRequirements, generateChecklistForLaw, analyzeOrganization } from './services/gemini';
import { Law, OrganizationLaw, ChecklistItem } from './types';
import { Book, Building2, CheckSquare, ChevronRight, Loader2, Plus, Search, ShieldAlert, Trash2, ExternalLink, BrainCircuit, CheckCircle2, Circle, Pencil, ChevronDown, FileText, Scale, Award, Leaf, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [regulations, setRegulations] = useState<Law[]>([]);
  const [iso9001, setIso9001] = useState<Law[]>([]);
  const [iso14001, setIso14001] = useState<Law[]>([]);
  const [orgLaws, setOrgLaws] = useState<OrganizationLaw[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(false);
  const [activeTab, setActiveTab] = useState<'laws' | 'regulations' | 'iso9001' | 'iso14001' | 'org'>('laws');
  const [isLawsMenuOpen, setIsLawsMenuOpen] = useState(true);
  const [isIsoMenuOpen, setIsIsoMenuOpen] = useState(false);
  const [selectedOrgLaw, setSelectedOrgLaw] = useState<OrganizationLaw | null>(null);
  const [generatingChecklist, setGeneratingChecklist] = useState<string | null>(null);
  const [orgName, setOrgName] = useState(() => localStorage.getItem('orgName') || 'Min Organisation');
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [tempOrgName, setTempOrgName] = useState(orgName);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string | string[]>>({
    'Bransch': '',
    'Antal anställda': '',
    'Arbetsmiljöer': [],
    'Fysiska risker': [],
    'Kemiska och biologiska risker': [],
    'Organisatoriska och sociala risker': [],
    'Verksamhetsspecifika moment': []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const toggleArrayItem = (key: string, value: string) => {
    setQuestionnaireAnswers(prev => {
      const current = (prev[key] as string[]) || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };
  const [suggestedLaws, setSuggestedLaws] = useState<Law[] | null>(null);
  const [openOrgGroups, setOpenOrgGroups] = useState<Record<string, boolean>>({
    lagar: true,
    foreskrifter: true,
    iso9001: true,
    iso14001: true,
    other: true
  });

  const orgLagar = orgLaws.filter(l => l.type === 'Lag');
  const orgForeskrifter = orgLaws.filter(l => l.type === 'Föreskrift');
  const orgIso9001 = orgLaws.filter(l => l.type === 'ISO-standard' && l.title.includes('9001'));
  const orgIso14001 = orgLaws.filter(l => l.type === 'ISO-standard' && l.title.includes('14001'));
  const orgOther = orgLaws.filter(l => l.type !== 'Lag' && l.type !== 'Föreskrift' && !(l.type === 'ISO-standard' && (l.title.includes('9001') || l.title.includes('14001'))));

  const toggleOrgGroup = (group: string) => {
    setOpenOrgGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Load initial org data
  useEffect(() => {
    const savedOrgLaws = localStorage.getItem('orgLaws');
    if (savedOrgLaws) {
      setOrgLaws(JSON.parse(savedOrgLaws));
    }

    // Pre-fetch all categories in the background for speed
    const categories: ('laws' | 'regulations' | 'iso9001' | 'iso14001')[] = ['laws', 'regulations', 'iso9001', 'iso14001'];
    categories.forEach(async (cat) => {
      const cacheKey = `cached_${cat}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        try {
          const fetched = await fetchRequirements(cat);
          if (fetched && fetched.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(fetched));
            // Populate state if it's currently empty
            if (cat === 'laws') setLaws(prev => prev.length === 0 ? fetched : prev);
            if (cat === 'regulations') setRegulations(prev => prev.length === 0 ? fetched : prev);
            if (cat === 'iso9001') setIso9001(prev => prev.length === 0 ? fetched : prev);
            if (cat === 'iso14001') setIso14001(prev => prev.length === 0 ? fetched : prev);
          }
        } catch (e) {
          console.error(`Background fetch failed for ${cat}`, e);
        }
      }
    });
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'org') return;

    const loadData = async () => {
      const cacheKey = `cached_${activeTab}`;
      const cached = localStorage.getItem(cacheKey);
      
      let currentData: Law[] = [];
      if (activeTab === 'laws') currentData = laws;
      if (activeTab === 'regulations') currentData = regulations;
      if (activeTab === 'iso9001') currentData = iso9001;
      if (activeTab === 'iso14001') currentData = iso14001;

      if (currentData.length > 0) return; // Already loaded in state

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) {
          if (activeTab === 'laws') setLaws(parsed);
          if (activeTab === 'regulations') setRegulations(parsed);
          if (activeTab === 'iso9001') setIso9001(parsed);
          if (activeTab === 'iso14001') setIso14001(parsed);
          return;
        }
      }
      
      setLoadingLaws(true);
      try {
        const fetched = await fetchRequirements(activeTab);
        if (fetched && fetched.length > 0) {
          if (activeTab === 'laws') setLaws(fetched);
          if (activeTab === 'regulations') setRegulations(fetched);
          if (activeTab === 'iso9001') setIso9001(fetched);
          if (activeTab === 'iso14001') setIso14001(fetched);
          localStorage.setItem(cacheKey, JSON.stringify(fetched));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingLaws(false);
      }
    };

    loadData();
  }, [activeTab]);

  // Save org laws when they change
  useEffect(() => {
    localStorage.setItem('orgLaws', JSON.stringify(orgLaws));
    if (selectedOrgLaw) {
      const updated = orgLaws.find(l => l.id === selectedOrgLaw.id);
      if (updated) setSelectedOrgLaw(updated);
    }
  }, [orgLaws]);

  useEffect(() => {
    localStorage.setItem('orgName', orgName);
  }, [orgName]);

  const handleRefreshLaws = async () => {
    if (activeTab === 'org') return;
    setLoadingLaws(true);
    try {
      const fetched = await fetchRequirements(activeTab);
      if (fetched && fetched.length > 0) {
        if (activeTab === 'laws') setLaws(fetched);
        if (activeTab === 'regulations') setRegulations(fetched);
        if (activeTab === 'iso9001') setIso9001(fetched);
        if (activeTab === 'iso14001') setIso14001(fetched);
        localStorage.setItem(`cached_${activeTab}`, JSON.stringify(fetched));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLaws(false);
    }
  };

  const addToOrganization = (law: Law) => {
    if (orgLaws.some(l => l.id === law.id)) return;
    setOrgLaws([...orgLaws, { ...law, isApplicable: true }]);
  };

  const removeFromOrganization = (lawId: string) => {
    setOrgLaws(orgLaws.filter(l => l.id !== lawId));
    if (selectedOrgLaw?.id === lawId) {
      setSelectedOrgLaw(null);
    }
  };

  const handleGenerateChecklist = async (orgLaw: OrganizationLaw) => {
    setGeneratingChecklist(orgLaw.id);
    try {
      const checklist = await generateChecklistForLaw(orgLaw.title, orgLaw.summary);
      setOrgLaws(prev => prev.map(l =>
        l.id === orgLaw.id ? { ...l, checklist } : l
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingChecklist(null);
    }
  };

  const toggleChecklistItem = (lawId: string, itemId: string) => {
    setOrgLaws(prev => prev.map(l => {
      if (l.id !== lawId || !l.checklist) return l;
      return {
        ...l,
        checklist: l.checklist.map(item =>
          item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
        )
      };
    }));
  };

  const calculateProgress = (checklist?: ChecklistItem[]) => {
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter(i => i.isCompleted).length;
    return Math.round((completed / checklist.length) * 100);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-100 flex flex-col shadow-xl z-10 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <ShieldAlert className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Compliance<br/>kompassen</h1>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-2">
          <div>
            <button
              onClick={() => setIsLawsMenuOpen(!isLawsMenuOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                (activeTab === 'laws' || activeTab === 'regulations') && !isLawsMenuOpen ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5" />
                Lagar & Föreskrifter
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isLawsMenuOpen ? "rotate-180" : "")} />
            </button>
            
            {isLawsMenuOpen && (
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => { setActiveTab('laws'); setSelectedOrgLaw(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 pl-12 rounded-lg transition-colors text-sm font-medium",
                    activeTab === 'laws' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  Lagar
                </button>
                <button
                  onClick={() => { setActiveTab('regulations'); setSelectedOrgLaw(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 pl-12 rounded-lg transition-colors text-sm font-medium",
                    activeTab === 'regulations' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  Föreskrifter
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setIsIsoMenuOpen(!isIsoMenuOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                (activeTab === 'iso9001' || activeTab === 'iso14001') && !isIsoMenuOpen ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                ISO-standarder
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isIsoMenuOpen ? "rotate-180" : "")} />
            </button>
            
            {isIsoMenuOpen && (
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => { setActiveTab('iso9001'); setSelectedOrgLaw(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 pl-12 rounded-lg transition-colors text-sm font-medium",
                    activeTab === 'iso9001' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  ISO 9001
                </button>
                <button
                  onClick={() => { setActiveTab('iso14001'); setSelectedOrgLaw(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 pl-12 rounded-lg transition-colors text-sm font-medium",
                    activeTab === 'iso14001' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  ISO 14001
                </button>
              </div>
            )}
          </div>
          
          <div
            onClick={() => { setActiveTab('org'); setSelectedOrgLaw(null); }}
            className={cn(
              "w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors text-sm font-medium cursor-pointer group mt-4",
              activeTab === 'org' && !selectedOrgLaw ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Building2 className="w-5 h-5 shrink-0" />
            
            {isEditingOrgName ? (
              <input
                autoFocus
                value={tempOrgName}
                onChange={(e) => setTempOrgName(e.target.value)}
                onBlur={() => {
                  if(tempOrgName.trim()) setOrgName(tempOrgName.trim());
                  setIsEditingOrgName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if(tempOrgName.trim()) setOrgName(tempOrgName.trim());
                    setIsEditingOrgName(false);
                  } else if (e.key === 'Escape') {
                    setTempOrgName(orgName);
                    setIsEditingOrgName(false);
                  }
                }}
                className="bg-slate-900/50 border border-blue-400 text-white px-2 py-0.5 rounded outline-none w-full text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1 text-left">{orgName}</span>
            )}

            {!isEditingOrgName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTempOrgName(orgName);
                  setIsEditingOrgName(true);
                }}
                className={cn(
                  "p-1.5 rounded-md transition-opacity",
                  activeTab === 'org' && !selectedOrgLaw ? "text-blue-200 hover:bg-blue-700 hover:text-white" : "opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-slate-700 hover:text-white"
                )}
                title="Ändra namn"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {!isEditingOrgName && orgLaws.length > 0 && (
              <span className={cn(
                "ml-auto py-0.5 px-2 rounded-full text-xs",
                activeTab === 'org' && !selectedOrgLaw ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-300"
              )}>
                {orgLaws.length}
              </span>
            )}
          </div>

          {/* Sub-menu for org laws */}
          {orgLaws.length > 0 && (
            <div className="pt-2 pb-2 space-y-3">
              {[
                { id: 'lagar', label: 'Lagar', items: orgLagar },
                { id: 'foreskrifter', label: 'Föreskrifter', items: orgForeskrifter },
                { id: 'iso9001', label: 'ISO 9001', items: orgIso9001 },
                { id: 'iso14001', label: 'ISO 14001', items: orgIso14001 },
                { id: 'other', label: 'Övrigt', items: orgOther }
              ].map(group => group.items.length > 0 && (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => toggleOrgGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", openOrgGroups[group.id] ? "rotate-180" : "")} />
                  </button>
                  {openOrgGroups[group.id] && (
                    <div className="space-y-0.5">
                      {group.items.map(law => (
                        <button
                          key={law.id}
                          onClick={() => { setActiveTab('org'); setSelectedOrgLaw(law); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-4 py-2 pl-11 rounded-lg transition-colors text-xs text-left line-clamp-1",
                            selectedOrgLaw?.id === law.id ? "text-blue-400 bg-slate-800/50 font-medium" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          <span className="truncate">{law.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-semibold text-slate-800">
            {activeTab === 'laws' ? 'Sveriges Lagar' : 
             activeTab === 'regulations' ? 'Arbetsmiljöverkets Föreskrifter' :
             activeTab === 'iso9001' ? 'ISO 9001 - Kvalitetsledningssystem' :
             activeTab === 'iso14001' ? 'ISO 14001 - Miljöledningssystem' :
             selectedOrgLaw ? selectedOrgLaw.title : `${orgName}s Lagkrav`}
          </h2>
          {activeTab !== 'org' && (
            <button 
              onClick={handleRefreshLaws}
              disabled={loadingLaws}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingLaws ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Leta efter uppdateringar
            </button>
          )}
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* REQUIREMENTS TABS */}
          {(activeTab === 'laws' || activeTab === 'regulations' || activeTab === 'iso9001' || activeTab === 'iso14001') && (
            <div className="max-w-5xl mx-auto">
              
              {(activeTab === 'iso9001' || activeTab === 'iso14001') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-amber-800">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Viktig information om ISO-standarder</p>
                    <p>
                      Texterna nedan är sammanfattningar av kraven i {activeTab === 'iso9001' ? 'ISO 9001' : 'ISO 14001'} och utgör inte den officiella standardtexten. Eftersom ISO-standarder är upphovsrättsskyddade får den exakta texten inte återges i sin helhet. För officiell certifiering måste du utgå från den köpta, officiella standarden.
                    </p>
                  </div>
                </div>
              )}

              {loadingLaws ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-lg font-medium">Hämtar aktuella {activeTab === 'laws' ? 'lagar' : activeTab === 'regulations' ? 'föreskrifter' : 'ISO-krav'}...</p>
                  <p className="text-sm mt-2">Använder Google Search Grounding för senaste data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(activeTab === 'laws' ? laws : activeTab === 'regulations' ? regulations : activeTab === 'iso9001' ? iso9001 : iso14001).map(law => {
                    const isAdded = orgLaws.some(l => l.id === law.id);
                    return (
                      <div key={law.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md",
                            law.type === 'Lag' ? "bg-indigo-100 text-indigo-700" : 
                            law.type === 'ISO-standard' ? "bg-purple-100 text-purple-700" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {law.type}
                          </span>
                          {law.url && (
                            <a href={law.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{law.title}</h3>
                        <p className="text-slate-600 text-sm flex-1 mb-6 line-clamp-3">{law.summary}</p>
                        
                        <button
                          onClick={() => addToOrganization(law)}
                          disabled={isAdded}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all",
                            isAdded 
                              ? "bg-slate-100 text-slate-500 cursor-not-allowed" 
                              : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                          )}
                        >
                          {isAdded ? (
                            <><CheckSquare className="w-4 h-4" /> Tillagd i organisation</>
                          ) : (
                            <><Plus className="w-4 h-4" /> Lägg till som applicerbar</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ORG LAWS TAB - OVERVIEW */}
          {activeTab === 'org' && !selectedOrgLaw && !showQuestionnaire && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-8 bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-1">Hitta relevanta lagkrav</h3>
                  <p className="text-blue-700 text-sm">Svara på några snabba frågor om din verksamhet så hjälper AI dig att hitta vilka lagar och föreskrifter som gäller för er.</p>
                </div>
                <button 
                  onClick={() => setShowQuestionnaire(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ml-4 flex items-center gap-2"
                >
                  <BrainCircuit className="w-5 h-5" />
                  Starta analys
                </button>
              </div>

              {orgLaws.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">Inga lagar valda ännu</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">
                    Gå till "Lagar & Föreskrifter" eller "ISO-standarder" för att välja vilka krav som är applicerbara för {orgName}.
                  </p>
                  <button 
                    onClick={() => setActiveTab('laws')}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Utforska krav
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  {[
                    { id: 'lagar', label: 'Lagar', icon: <Book className="w-5 h-5 text-indigo-600" />, items: orgLagar },
                    { id: 'foreskrifter', label: 'Föreskrifter', icon: <Scale className="w-5 h-5 text-emerald-600" />, items: orgForeskrifter },
                    { id: 'iso9001', label: 'ISO 9001', icon: <Award className="w-5 h-5 text-purple-600" />, items: orgIso9001 },
                    { id: 'iso14001', label: 'ISO 14001', icon: <Leaf className="w-5 h-5 text-green-600" />, items: orgIso14001 },
                    { id: 'other', label: 'Övrigt', icon: <FileText className="w-5 h-5 text-slate-600" />, items: orgOther }
                  ].map(group => group.items.length > 0 && (
                    <section key={group.id}>
                      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        {group.icon} {group.label}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.items.map(law => {
                          const progress = calculateProgress(law.checklist);
                          return (
                            <div 
                              key={law.id} 
                              onClick={() => setSelectedOrgLaw(law)}
                              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-5 cursor-pointer flex flex-col gap-4 group"
                            >
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h4 className="text-base font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{law.title}</h4>
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0",
                                    law.type === 'Lag' ? "bg-indigo-100 text-indigo-700" : 
                                    law.type === 'ISO-standard' ? "bg-purple-100 text-purple-700" :
                                    "bg-emerald-100 text-emerald-700"
                                  )}>
                                    {law.type}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-sm line-clamp-2">{law.summary}</p>
                              </div>
                              
                              <div className="w-full shrink-0 mt-auto pt-4 border-t border-slate-100">
                                {law.checklist ? (
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium text-slate-600">
                                      <span>Efterlevnad</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={cn("h-full transition-all duration-500", progress === 100 ? "bg-emerald-500" : "bg-blue-500")} 
                                        style={{ width: `${progress}%` }} 
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 italic flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> Generera checklista för att mäta efterlevnad
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QUESTIONNAIRE VIEW */}
          {activeTab === 'org' && showQuestionnaire && (
            <div className="max-w-3xl mx-auto">
              <button 
                onClick={() => {
                  setShowQuestionnaire(false);
                  setSuggestedLaws(null);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
                Tillbaka till översikten
              </button>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <BrainCircuit className="w-8 h-8 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-800">Verksamhetsanalys</h2>
                </div>
                
                {!suggestedLaws ? (
                  <>
                    <p className="text-slate-600 mb-8">
                      Svara på frågorna nedan så analyserar vår AI vilka lagar, föreskrifter och ISO-standarder som är mest kritiska för er verksamhet.
                    </p>

                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Vilken bransch är organisationen verksam inom?</label>
                          <input 
                            type="text" 
                            placeholder="T.ex. Bygg, IT, Tillverkning, Vård..."
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={questionnaireAnswers['Bransch'] as string}
                            onChange={e => setQuestionnaireAnswers({...questionnaireAnswers, 'Bransch': e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Hur många anställda har ni ungefär?</label>
                          <select 
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            value={questionnaireAnswers['Antal anställda'] as string}
                            onChange={e => setQuestionnaireAnswers({...questionnaireAnswers, 'Antal anställda': e.target.value})}
                          >
                            <option value="">Välj antal...</option>
                            <option value="1-9">1-9 anställda</option>
                            <option value="10-49">10-49 anställda</option>
                            <option value="50-249">50-249 anställda</option>
                            <option value="250+">250+ anställda</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">Vilka arbetsmiljöer förekommer? (Välj alla som passar)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {['Kontor', 'Produktion/Industri', 'Byggarbetsplats', 'Vård/Omsorg', 'Transport/Lager', 'Utomhusarbete', 'Butik/Handel', 'Restaurang/Kök', 'Laboratorium', 'Skola/Utbildning', 'Lantbruk/Skogsbruk'].map(env => (
                            <label key={env} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                              <input type="checkbox" checked={(questionnaireAnswers['Arbetsmiljöer'] as string[]).includes(env)} onChange={() => toggleArrayItem('Arbetsmiljöer', env)} className="rounded text-blue-600 focus:ring-blue-500" />
                              <span className="text-sm text-slate-700">{env}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Riskkartläggning</h3>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Fysiska risker</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {['Tunga lyft', 'Vibrerande verktyg/maskiner', 'Arbete på hög höjd', 'Buller', 'Extrem värme/kyla', 'Dålig ergonomi/Stillasittande', 'Strålning (t.ex. röntgen, UV)'].map(risk => (
                                <label key={risk} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                                  <input type="checkbox" checked={(questionnaireAnswers['Fysiska risker'] as string[]).includes(risk)} onChange={() => toggleArrayItem('Fysiska risker', risk)} className="rounded text-blue-600 focus:ring-blue-500" />
                                  <span className="text-sm text-slate-700">{risk}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Kemiska & Biologiska risker</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {['Farliga kemikalier', 'Härdplaster/Allergiframkallande', 'Smittorisker', 'Damm/Partiklar (t.ex. kvarts)', 'Asbest', 'Brandfarliga varor', 'Biologiska agens (t.ex. virus, bakterier)'].map(risk => (
                                <label key={risk} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                                  <input type="checkbox" checked={(questionnaireAnswers['Kemiska och biologiska risker'] as string[]).includes(risk)} onChange={() => toggleArrayItem('Kemiska och biologiska risker', risk)} className="rounded text-blue-600 focus:ring-blue-500" />
                                  <span className="text-sm text-slate-700">{risk}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Organisatoriska & Sociala risker</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {['Nattarbete', 'Ensamarbete', 'Hög stress/arbetsbelastning', 'Risk för hot och våld', 'Skiftarbete', 'Otydliga krav/förväntningar', 'Kränkande särbehandling/Mobbning'].map(risk => (
                                <label key={risk} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                                  <input type="checkbox" checked={(questionnaireAnswers['Organisatoriska och sociala risker'] as string[]).includes(risk)} onChange={() => toggleArrayItem('Organisatoriska och sociala risker', risk)} className="rounded text-blue-600 focus:ring-blue-500" />
                                  <span className="text-sm text-slate-700">{risk}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Verksamhetsspecifika moment</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {['Körning i tjänsten', 'Livsmedelshantering', 'Heta arbeten', 'Truckkörning', 'Arbete i slutna utrymmen', 'Hantering av kontanter', 'Arbete med minderåriga', 'Dykning/Arbete under vatten'].map(risk => (
                                <label key={risk} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                                  <input type="checkbox" checked={(questionnaireAnswers['Verksamhetsspecifika moment'] as string[]).includes(risk)} onChange={() => toggleArrayItem('Verksamhetsspecifika moment', risk)} className="rounded text-blue-600 focus:ring-blue-500" />
                                  <span className="text-sm text-slate-700">{risk}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={async () => {
                          setIsAnalyzing(true);
                          const results = await analyzeOrganization(questionnaireAnswers);
                          setSuggestedLaws(results);
                          setIsAnalyzing(false);
                        }}
                        disabled={isAnalyzing || !questionnaireAnswers['Bransch'] || !questionnaireAnswers['Antal anställda']}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyserar verksamheten...
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-5 h-5" />
                            Analysera och hitta krav
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3 text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Analys slutförd</p>
                        <p className="text-sm mt-1">Baserat på dina svar har vi identifierat följande lagkrav och föreskrifter som är särskilt viktiga för er verksamhet. Klicka på "Lägg till" för att spara dem till er organisation.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {suggestedLaws.map(law => {
                        const isAdded = orgLaws.some(l => l.id === law.id);
                        return (
                          <div key={law.id} className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={cn(
                                    "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                    law.type === 'Lag' ? "bg-indigo-100 text-indigo-700" : 
                                    law.type === 'ISO-standard' ? "bg-purple-100 text-purple-700" :
                                    "bg-emerald-100 text-emerald-700"
                                  )}>
                                    {law.type}
                                  </span>
                                  <h4 className="font-semibold text-slate-900">{law.title}</h4>
                                </div>
                                <p className="text-sm text-slate-600">{law.summary}</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (isAdded) {
                                    setOrgLaws(orgLaws.filter(l => l.id !== law.id));
                                  } else {
                                    setOrgLaws([...orgLaws, { ...law, isApplicable: true }]);
                                  }
                                }}
                                className={cn(
                                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                  isAdded 
                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                )}
                              >
                                {isAdded ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Tillagd
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" />
                                    Lägg till
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ORG LAWS TAB - DETAIL VIEW */}
          {activeTab === 'org' && selectedOrgLaw && (
            <div className="max-w-4xl mx-auto">
              
              {/* Detail Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8 relative overflow-hidden">
                <div className={cn(
                  "absolute top-0 left-0 w-1.5 h-full",
                  selectedOrgLaw.type === 'Lag' ? "bg-indigo-600" : 
                  selectedOrgLaw.type === 'ISO-standard' ? "bg-purple-600" :
                  "bg-emerald-600"
                )} />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={cn(
                      "inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md mb-3",
                      selectedOrgLaw.type === 'Lag' ? "bg-indigo-100 text-indigo-700" : 
                      selectedOrgLaw.type === 'ISO-standard' ? "bg-purple-100 text-purple-700" :
                      "bg-emerald-100 text-emerald-700"
                    )}>
                      {selectedOrgLaw.type}
                    </span>
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">{selectedOrgLaw.title}</h1>
                    <p className="text-slate-600 text-lg leading-relaxed max-w-3xl">{selectedOrgLaw.summary}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pt-6 mt-6 border-t border-slate-100">
                  <button 
                    onClick={() => removeFromOrganization(selectedOrgLaw.id)}
                    className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Ta bort från organisation
                  </button>
                  {selectedOrgLaw.url && (
                    <a 
                      href={selectedOrgLaw.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Läs fullständig text
                    </a>
                  )}
                </div>
              </div>

              {/* Checklist Section */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <CheckSquare className="w-6 h-6 text-blue-600" />
                    Checklista för Efterlevnad
                  </h2>
                  
                  {selectedOrgLaw.checklist && (
                    <div className="text-sm font-medium bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm">
                      {selectedOrgLaw.checklist.filter(i => i.isCompleted).length} av {selectedOrgLaw.checklist.length} klara
                    </div>
                  )}
                </div>

                {!selectedOrgLaw.checklist ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
                    <BrainCircuit className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Generera AI-Checklista</h3>
                    <p className="text-slate-600 max-w-lg mx-auto mb-8">
                      Låt vår avancerade AI (Gemini 3.1 Pro med High Thinking) analysera lagkravet och skapa en detaljerad, praktisk checklista anpassad för att säkerställa att din organisation uppfyller alla krav.
                    </p>
                    <button
                      onClick={() => handleGenerateChecklist(selectedOrgLaw)}
                      disabled={generatingChecklist === selectedOrgLaw.id}
                      className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-3 mx-auto text-lg"
                    >
                      {generatingChecklist === selectedOrgLaw.id ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          AI analyserar lagkrav (kan ta upp till 30s)...
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-6 h-6" />
                          Generera Checklista
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedOrgLaw.checklist.map((item) => (
                      <div 
                        key={item.id}
                        className={cn(
                          "bg-white rounded-xl border-2 transition-all p-5 flex gap-5 group",
                          item.isCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-blue-200 hover:shadow-sm"
                        )}
                      >
                        <button 
                          onClick={() => toggleChecklistItem(selectedOrgLaw.id, item.id)}
                          className="mt-1 shrink-0 focus:outline-none"
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                          ) : (
                            <Circle className="w-7 h-7 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          )}
                        </button>
                        <div>
                          <h4 className={cn(
                            "text-lg font-bold mb-2 transition-colors",
                            item.isCompleted ? "text-slate-500 line-through" : "text-slate-900 group-hover:text-blue-700"
                          )}>
                            {item.task}
                          </h4>
                          <p className={cn(
                            "text-base leading-relaxed",
                            item.isCompleted ? "text-slate-400" : "text-slate-600"
                          )}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
