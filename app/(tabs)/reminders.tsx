import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { loadData, saveData, KEYS } from '../../src/services/storage';

export interface ReminderItem {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

export default function RemindersScreen() {
  const { theme } = useAppTheme();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    loadData<ReminderItem[]>(KEYS.REMINDERS, []).then(setItems);
  }, []);

  const handleToggleComplete = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(updated);
    await saveData(KEYS.REMINDERS, updated);
  };

  const handleAddReminder = async () => {
    if (!input.trim()) return;

    const today = new Date();
    const dateFormatted = `${today.getDate()} ${today.toLocaleDateString('ru-RU', { month: 'short' })}`;

    const newItem: ReminderItem = {
      id: Date.now().toString(),
      title: input.trim(),
      date: dateFormatted,
      completed: false,
    };

    const updated = [newItem, ...items];
    setItems(updated);
    await saveData(KEYS.REMINDERS, updated);
    setInput('');
  };

  const handleDeleteReminder = async (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    await saveData(KEYS.REMINDERS, updated);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Строка быстрого ввода */}
      <View style={[styles.addBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TextInput
          placeholder="Новая задача..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleAddReminder}
          returnKeyType="done"
          style={[
            styles.input,
            {
              backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9',
              color: theme.textPrimary,
            },
          ]}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}
          onPress={handleAddReminder}>
          <Text style={styles.addBtnText}>Добавить</Text>
        </TouchableOpacity>
      </View>

      {/* Список или пустое состояние */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Список задач пуст</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Введите название задачи выше и нажмите «Добавить»
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
              onPress={() => handleToggleComplete(item.id)}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  item.completed && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}>
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>

              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.title,
                    { color: theme.textPrimary },
                    item.completed && { textDecorationLine: 'line-through', color: theme.textSecondary },
                  ]}>
                  {item.title}
                </Text>
                <Text style={[styles.date, { color: theme.textSecondary }]}>{item.date}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteReminder(item.id)}
                hitSlop={10}
                style={styles.deleteBtn}>
                <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBar: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
