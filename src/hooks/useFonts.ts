import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts as useExpoFonts,
} from '@expo-google-fonts/poppins';

export function usePoppins() {
  const [loaded, error] = useExpoFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  return { fontsLoaded: loaded, fontError: error };
}
