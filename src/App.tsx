import { useMemo, useState } from 'react';
import type { AssetKey, Portfolio, SavedPortfolioRecord, SubnetRow, TabKey } from '@/types';
import { DEFAULT_TAB } from '@/constants/tabs';
import { CHANGE_DEFAULT } from '@/constants/portfolio';
import { ALPHA_PROFILE, ASSET_PROFILES, DEFAULT_ASSET, STOCK_PROFILE, profileForAssetClass } from '@/constants/assets';
import { useSavedPortfolios } from '@/store/savedPortfolios/context';
import type { UpdateSavedExtra } from '@/store/savedPortfolios/context';
import { AssetProfileContext } from '@/store/asset/context';
import { useAlphaSubnetData } from '@/hooks/useAlphaSubnetData';
import { useUsStockData } from '@/hooks/useUsStockData';
import { useDataTools } from '@/webmcp/useDataTools';
import { buildColumns } from '@/utils/subnetData';
import { cn } from '@/utils/classNames';
import { Notice } from '@/components/ui';
import { BookmarkIcon, TableIcon, TargetIcon } from '@/components/icons';
import { AppHeader } from '@/components/layout/AppHeader';
import { AssetSwitcher } from '@/components/layout/AssetSwitcher';
import { TabBar, type TabItem } from '@/components/layout/TabBar';
import { DataInputCard } from '@/components/data-input/DataInputCard';
import { StockDataCard } from '@/components/data-input/StockDataCard';
import { DataTable } from '@/components/data-table/DataTable';
import { PortfolioBuilder } from '@/components/portfolio/PortfolioBuilder';
import { SavedPortfolios } from '@/components/saved/SavedPortfolios';
import { AgentActivityLog } from '@/components/agent/AgentActivityLog';

/**
 * Gốc của app: giữ bảng dữ liệu của hai mục đầu tư (alpha + cổ phiếu Mỹ đều
 * tự tải từ API), mục + tab đang mở; kết nối với store danh mục đã lưu và
 * đăng ký bộ tool WebMCP cấp App.
 *
 * Nhánh cổ phiếu Mỹ được bọc AssetProfileContext = STOCK_PROFILE; nhánh alpha
 * dùng context mặc định (ALPHA_PROFILE) nên chạy đúng như trước.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(DEFAULT_TAB);
  const [asset, setAsset] = useState<AssetKey>(DEFAULT_ASSET);
  const alpha = useAlphaSubnetData();
  const stock = useUsStockData();
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

  const profile = ASSET_PROFILES[asset];
  const allData = alpha.rows;
  const activeData = asset === 'stock' ? stock.rows : allData;
  const columns = useMemo(() => buildColumns(activeData), [activeData]);

  // Danh mục đã lưu của mục đang xem + vị trí của chúng trong store chung
  // (store giữ cả hai mục; mỗi mục chỉ thấy bản ghi cùng asset class).
  const savedView = useMemo(() => {
    const indices: number[] = [];
    const list: SavedPortfolioRecord[] = [];
    savedPortfolios.forEach((s, i) => {
      if (profileForAssetClass(s.portfolio?._).key === asset) {
        indices.push(i);
        list.push(s);
      }
    });
    return { indices, list };
  }, [savedPortfolios, asset]);

  function handleSubmit(data: SubnetRow[], deregIds: number[] = []) {
    // applyManual + filterExcludedSubnets trong hook (theo deregIds truyền vào).
    alpha.applyManual(data, deregIds);
  }

  function handleClear() {
    alpha.clear();
    setActiveTab(DEFAULT_TAB);
  }

  // Tool cấp App. Đăng ký ở đây để chúng tồn tại bất kể tab nào đang mở —
  // agent gọi được load_subnet_data hay switch_tab ở mọi thời điểm.
  useDataTools({
    asset,
    setAsset,
    stockData: stock.rows,
    reloadStockData: stock.reload,
    reloadAlphaData: alpha.reload,
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
    { key: 'table', label: 'Data table', icon: <TableIcon size={15} />, count: activeData.length },
    { key: 'portfolio', label: 'Portfolio gen', icon: <TargetIcon size={15} /> },
    {
      key: 'saved',
      label: 'Danh mục đã lưu',
      icon: <BookmarkIcon size={15} />,
      count: savedView.list.length > 0 ? savedView.list.length : undefined,
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

        <AssetSwitcher value={asset} onChange={setAsset} counts={{ alpha: allData.length, stock: stock.rows.length }} />

        {/* Hai card luôn mount (ẩn bằng CSS): giữ state khi chuyển mục. */}
        <div className={cn(asset === 'alpha' ? 'contents' : 'hidden')}>
          <DataInputCard alpha={alpha} />
        </div>
        <div className={cn(asset === 'stock' ? 'contents' : 'hidden')}>
          <StockDataCard stock={stock} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          <AssetProfileContext.Provider value={profile}>
            {activeTab === 'table' && <DataTable key={asset} data={activeData} columns={columns} />}
          </AssetProfileContext.Provider>

          {/* PortfolioBuilder luôn mount (chỉ ẩn bằng CSS) để tool WebMCP của nó không
              biến mất khi người dùng chuyển tab — agent phải gọi được
              generate_portfolio ngay cả lúc đang xem bảng dữ liệu.
              Mỗi mục đầu tư một builder (giữ danh mục đang dựng khi chuyển mục);
              chỉ builder của mục đang xem đăng ký tool.
              `contents` giữ nguyên layout flex của component cha. */}
          <div className={cn(activeTab === 'portfolio' && asset === 'alpha' ? 'contents' : 'hidden')}>
            <AssetProfileContext.Provider value={ALPHA_PROFILE}>
              <PortfolioBuilder
                allData={allData}
                savedPortfolios={savedPortfolios}
                onSavePortfolio={savePortfolio}
                toolsEnabled={asset === 'alpha'}
              />
            </AssetProfileContext.Provider>
          </div>
          <div className={cn(activeTab === 'portfolio' && asset === 'stock' ? 'contents' : 'hidden')}>
            <AssetProfileContext.Provider value={STOCK_PROFILE}>
              <PortfolioBuilder
                allData={stock.rows}
                savedPortfolios={savedPortfolios}
                onSavePortfolio={savePortfolio}
                toolsEnabled={asset === 'stock'}
              />
            </AssetProfileContext.Provider>
          </div>

          {activeTab === 'saved' && (
            <div className="flex h-0 grow flex-col overflow-hidden pt-4">
              <AssetProfileContext.Provider value={profile}>
                <SavedPortfolios
                  key={asset}
                  savedList={savedView.list}
                  exportList={savedPortfolios}
                  currentData={activeData}
                  filterKey={asset === 'alpha' ? CHANGE_DEFAULT : profile.defaultMetric}
                  onDelete={(i) => deleteSaved(savedView.indices[i])}
                  onUpdate={(i: number, p: Portfolio, extra?: UpdateSavedExtra | null) =>
                    updateSaved(savedView.indices[i], p, extra)
                  }
                  onRename={(i, name) => renameSaved(savedView.indices[i], name)}
                  onImport={importPortfolios}
                />
              </AssetProfileContext.Provider>
            </div>
          )}
        </div>
      </main>
      <AgentActivityLog />
    </div>
  );
}
