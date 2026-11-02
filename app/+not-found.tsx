import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export default function NotFoundScreen() {
  const { theme } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Страница не найдена' }} />
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Этого экрана не существует</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: theme.accent }]}>Вернуться на главную</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
