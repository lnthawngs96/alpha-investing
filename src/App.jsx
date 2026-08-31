import { useState, useMemo } from 'react';
import InputCard from './components/InputCard';
import DataTable from './components/DataTable';
import Portfolio from './components/Portfolio';
import SavedPortfolios from './components/SavedPortfolios';
import { filterExcludedSubnets } from './constants/excludedSubnets';
import { useSavedPortfolios } from './context/savedPortfoliosStore';
import { buildColumns } from './utils/helpers';

export default function App() {
  const [allData, setAllData] = useState([]);
  const [activeTab, setActiveTab] = useState('table');
  const {
    savedPortfolios,
    restoredFromBackup,
    dismissRestoredNotice,
    savePortfolio,
    deleteSaved,
    updateSaved,
    renameSaved,
    importPortfolios,
  } = useSavedPortfolios();

  const columns = useMemo(() => buildColumns(allData), [allData]);

  function handleSubmit(data) {
    setAllData(filterExcludedSubnets(data));
  }

  function handleClear() {
    setAllData([]);
    setActiveTab('table');
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-mono flex flex-col overflow-hidden">
      <main className="px-8 py-6 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
        {restoredFromBackup && (
          <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs">
            <span>
              ⚠ localStorage thiếu dữ liệu — đã khôi phục danh mục từ bản sao trong sessionStorage.
            </span>
            <button
              className="bg-transparent border-none text-amber-200 cursor-pointer font-bold px-2"
              onClick={dismissRestoredNotice}
            >
              ✕
            </button>
          </div>
        )}
        <InputCard
          onSubmit={handleSubmit}
          onClear={handleClear}
          loadedCount={allData.length}
        />

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-700 shrink-0">
              <button
                className={`px-8 py-4 bg-transparent border-none border-b-2 font-mono text-xs font-bold tracking-wider cursor-pointer -mb-px transition-all duration-150 ${
                  activeTab === 'table'
                    ? 'text-violet-500 border-b-violet-500 bg-violet-500/5'
                    : 'text-slate-400 border-b-transparent hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('table')}
              >
                ⊞ DATA TABLE{' '}
                <span className="bg-violet-500 text-white text-xs font-bold px-4 rounded-xl ml-4">
                  {allData.length}
                </span>
              </button>
              <button
                className={`px-8 py-4 bg-transparent border-none border-b-2 font-mono text-xs font-bold tracking-wider cursor-pointer -mb-px transition-all duration-150 ${
                  activeTab === 'portfolio'
                    ? 'text-violet-500 border-b-violet-500 bg-violet-500/5'
                    : 'text-slate-400 border-b-transparent hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('portfolio')}
              >
                ◎ PORTFOLIO GEN
              </button>
              <button
                className={`px-8 py-4 bg-transparent border-none border-b-2 font-mono text-xs font-bold tracking-wider cursor-pointer -mb-px transition-all duration-150 ${
                  activeTab === 'saved'
                    ? 'text-violet-500 border-b-violet-500 bg-violet-500/5'
                    : 'text-slate-400 border-b-transparent hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('saved')}
              >
                ⬇ DANH MỤC ĐÃ LƯU{' '}
                {savedPortfolios.length > 0 && (
                  <span className="bg-violet-500 text-white text-xs font-bold px-4 rounded-xl ml-4">
                    {savedPortfolios.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'table' && (
              <DataTable data={allData} columns={columns} />
            )}
            {activeTab === 'portfolio' && (
              <Portfolio
                allData={allData}
                savedPortfolios={savedPortfolios}
                onSavePortfolio={savePortfolio}
              />
            )}
            {activeTab === 'saved' && (
              <div className="h-0 grow pt-4 flex flex-col overflow-hidden">
                <SavedPortfolios
                  savedList={savedPortfolios}
                  currentData={allData}
                  filterKey="price_change_1_day"
                  onDelete={deleteSaved}
                  onUpdate={updateSaved}
                  onRename={renameSaved}
                  onImport={importPortfolios}
                />
              </div>
            )}
          </div>
        
      </main>
    </div>
  );
}
