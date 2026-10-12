import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Radii } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { useTaskStore } from '@/store/useTaskStore';
import { haptic } from '@/utils/feedback';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const COLOR_SWATCHES = [Colors.purple, Colors.lime, Colors.cyan, Colors.pink, Colors.orange, Colors.success];

interface CategoryPickerProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function CategoryPicker({ selectedId, onSelect }: CategoryPickerProps) {
  const categories = useTaskStore((s) => s.categories);
  const addCategory = useTaskStore((s) => s.addCategory);
  const [expanded, setExpanded] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_SWATCHES[0]);
  const [adding, setAdding] = useState(false);
  const [nameError, setNameError] = useState('');
  const [lastAddedId, setLastAddedId] = useState<number | null>(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('Name is required'); return; }
    const exists = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) { setNameError('Category already exists'); return; }
    setAdding(true);
    setNameError('');
    try {
      const prevIds = new Set(categories.map((c) => c.id));
      await addCategory({ name: trimmed, color: newColor, icon: 'tag' });
      // Find newly added category
      const updated = useTaskStore.getState().categories;
      const newCat = updated.find((c) => !prevIds.has(c.id));
      if (newCat) {
        haptic.selection();
        setLastAddedId(newCat.id);
        onSelect(newCat.id); // auto-select
      }
      setNewName('');
      setExpanded(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}
      >
        {categories.map((cat, i) => (
          <Animated.View
            key={cat.id}
            entering={cat.id === lastAddedId ? FadeInDown.springify().damping(16).stiffness(300) : undefined}
          >
            <Chip
              label={cat.name}
              icon={cat.icon as FeatherIconName}
              selected={selectedId === cat.id}
              color={cat.color}
              onPress={() => {
                haptic.selection();
                onSelect(selectedId === cat.id ? null : cat.id);
              }}
            />
          </Animated.View>
        ))}
        <Chip
          label="+ New"
          selected={expanded}
          color={Colors.lime}
          onPress={() => setExpanded((v) => !v)}
        />
      </ScrollView>

      {expanded && (
        <View style={styles.newRow}>
          <View style={styles.nameInputRow}>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor={Colors.textFaint}
              value={newName}
              onChangeText={(v) => { setNewName(v); setNameError(''); }}
              maxLength={30}
              autoFocus
            />
          </View>
          {nameError ? (
            <AppText variant="caption" color={Colors.danger} style={styles.err}>
              {nameError}
            </AppText>
          ) : null}
          <View style={styles.swatches}>
            {COLOR_SWATCHES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.swatch, { backgroundColor: c, borderWidth: newColor === c ? 2 : 0, borderColor: Colors.text }]}
                onPress={() => setNewColor(c)}
                accessibilityLabel={`Color ${c}`}
              />
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { opacity: adding ? 0.6 : 1 }]}
              onPress={handleAdd}
              disabled={adding}
              accessibilityLabel="Add category"
            >
              <AppText variant="label" color={Colors.onAccent}>Add</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
    alignItems: 'center',
  },
  newRow: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.s2,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    padding: Spacing.s3,
    gap: Spacing.s2,
  },
  nameInputRow: { flexDirection: 'row' },
  input: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  err: { marginLeft: 4 },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  addBtn: {
    backgroundColor: Colors.lime,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
});
