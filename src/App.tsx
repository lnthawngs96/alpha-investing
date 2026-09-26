import { useMemo, useState } from 'react';
import type { SubnetRow, TabKey } from '@/types';
import { DEFAULT_TAB } from '@/constants/tabs';
import { CHANGE_DEFAULT } from '@/constants/portfolio';
import { useSavedPortfolios } from '@/store/savedPortfolios/context';
import { useDataTools } from '@/webmcp/useDataTools';
import { buildColumns, filterExcludedSubnets } from '@/utils/subnetData';
import { cn } from '@/utils/classNames';
import { Notice } from '@/components/ui';
import { BookmarkIcon, TableIcon, TargetIcon } from '@/components/icons';
import { AppHeader } from '@/components/layout/AppHeader';
import { TabBar, type TabItem } from '@/components/layout/TabBar';
import { DataInputCard } from '@/components/data-input/DataInputCard';
import { DataTable } from '@/components/data-table/DataTable';
import { PortfolioBuilder } from '@/components/portfolio/PortfolioBuilder';
import { SavedPortfolios } from '@/components/saved/SavedPortfolios';
import { AgentActivityLog } from '@/components/agent/AgentActivityLog';

/**
 * Gốc của app: giữ bảng dữ liệu (allData) và tab đang mở; kết nối với store
 * danh mục đã lưu và đăng ký bộ tool WebMCP cấp App.
 */
export default function App() {
  const [allData, setAllData] = useState<SubnetRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>(DEFAULT_TAB);
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

  function handleSubmit(data: SubnetRow[], deregIds: number[] = []) {
    setAllData(filterExcludedSubnets(data, deregIds));
  }

  function handleClear() {
    setAllData([]);
    setActiveTab(DEFAULT_TAB);
  }

  // Tool cấp App. Đăng ký ở đây để chúng tồn tại bất kể tab nào đang mở —
  // agent gọi được load_subnet_data hay switch_tab ở mọi thời điểm.
  useDataTools({
    allData,
    activeTab,
    setActiveTab,
    onSubmitData: handleSubmit,
    onClearData: handleClear,
    savedPortfolios,
    deleteSaved,
    renameSaved,
  });

  const tabs: TabItem[] = [
    { key: 'table', label: 'Data table', icon: <TableIcon size={15} />, count: allData.length },
    { key: 'portfolio', label: 'Portfolio gen', icon: <TargetIcon size={15} /> },
    {
      key: 'saved',
      label: 'Danh mục đã lưu',
      icon: <BookmarkIcon size={15} />,
      count: savedPortfolios.length > 0 ? savedPortfolios.length : undefined,
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-fg">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5">
        {restoredFromBackup && (
          <Notice tone="warning" onDismiss={dismissRestoredNotice} className="shrink-0">
            localStorage thiếu dữ liệu — đã khôi phục danh mục từ bản sao trong sessionStorage.
          </Notice>
        )}

        <DataInputCard onSubmit={handleSubmit} onClear={handleClear} loadedCount={allData.length} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'table' && <DataTable data={allData} columns={columns} />}

          {/* PortfolioBuilder luôn mount (chỉ ẩn bằng CSS) để tool WebMCP của nó không
              biến mất khi người dùng chuyển tab — agent phải gọi được
              generate_portfolio ngay cả lúc đang xem bảng dữ liệu.
              `contents` giữ nguyên layout flex của component cha. */}
          <div className={cn(activeTab === 'portfolio' ? 'contents' : 'hidden')}>
            <PortfolioBuilder allData={allData} savedPortfolios={savedPortfolios} onSavePortfolio={savePortfolio} />
          </div>

          {activeTab === 'saved' && (
            <div className="flex h-0 grow flex-col overflow-hidden pt-4">
              <SavedPortfolios
                savedList={savedPortfolios}
                currentData={allData}
                filterKey={CHANGE_DEFAULT}
                onDelete={deleteSaved}
                onUpdate={updateSaved}
                onRename={renameSaved}
                onImport={importPortfolios}
              />
            </div>
          )}
        </div>
      </main>
      <AgentActivityLog />
    </div>
  );
}
