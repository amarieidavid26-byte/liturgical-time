import { translations, Language } from '../translations';
import useAppStore from '../store/appStore';

export const useTranslation = () => {
  const language = useAppStore(state => state.language || 'ro') as Language;
  return translations[language];
};
