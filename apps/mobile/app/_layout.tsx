import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { queryClient } from '@/lib/query-client';
import { SessionProvider } from '@/src/session/session-provider';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="projects/[projectId]"
                options={{
                  title: 'Obra'
                }}
              />
              <Stack.Screen
                name="station/[stationId]"
                options={{
                  title: 'Detalle de estación'
                }}
              />
              <Stack.Screen
                name="station/new"
                options={{
                  title: 'Crear estación'
                }}
              />
              <Stack.Screen
                name="guide/[manualId]"
                options={{
                  title: 'Guías'
                }}
              />
              <Stack.Screen
                name="prisms/coverage/[groupCode]"
                options={{
                  title: 'Cobertura de prismas'
                }}
              />
              <Stack.Screen
                name="admin/guide"
                options={{
                  title: 'Guía admin'
                }}
              />
              <Stack.Screen
                name="history"
                options={{
                  title: 'Historial'
                }}
              />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
