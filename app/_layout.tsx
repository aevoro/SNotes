import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { ConfigProvider } from '../context/ConfigContext';
import { FoldersProvider } from '../context/FoldersContext';
import { NotesProvider } from '../context/NotesContext';
import { TodoProvider } from '../context/TodoContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  return (
    <ConfigProvider>
      <ThemeProvider>
        <FoldersProvider>
          <NotesProvider>
            <TodoProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </TodoProvider>
          </NotesProvider>
        </FoldersProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
