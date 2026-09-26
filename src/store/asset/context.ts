import { createContext, useContext } from 'react';
import type { AssetProfile } from '@/types';
import { ALPHA_PROFILE } from '@/constants/assets';

/**
 * Mục đầu tư của cây component bên dưới (alpha hoặc cổ phiếu Mỹ).
 * Mặc định là alpha — component nằm ngoài provider giữ nguyên hành vi cũ.
 * App bọc từng nhánh bằng `<AssetProfileContext.Provider value={...}>`.
 */
export const AssetProfileContext = createContext<AssetProfile>(ALPHA_PROFILE);

export function useAssetProfile(): AssetProfile {
  return useContext(AssetProfileContext);
}
