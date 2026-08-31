import { createContext, useContext } from 'react';

// Tách khỏi SavedPortfoliosContext.jsx để file provider chỉ export component
// (yêu cầu của react-refresh / Fast Refresh).
export const SavedPortfoliosContext = createContext(null);

export function useSavedPortfolios() {
  const ctx = useContext(SavedPortfoliosContext);
  if (!ctx) throw new Error('useSavedPortfolios phải nằm trong <SavedPortfoliosProvider>');
  return ctx;
}
