export type { Locale } from '@/types/locale';
export { LocaleProvider, useLocale } from './LocaleProvider';
export type { MessageKey } from './translate';
export { tt, getActiveLocale, setActiveLocale } from './activeLocale';
export {
  unitLabel,
  unitNoun,
  weightLabel,
  tierPrimaryName,
  tierSecondaryName,
  ruleLabel,
  localizedMetricLabel,
  localizedMetricsLabel,
  localizedTierLabel,
  localizedTierHint,
  localizeMetricOptions,
  columnLabel,
} from './labels';
