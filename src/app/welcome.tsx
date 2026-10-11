import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, SpringConfig } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { NotchCard } from '@/components/ui/NotchCard';
import { useSettingsStore } from '@/store/useSettingsStore';

const CARDS = [
  { color: Colors.cyan,   icon: 'check-square' as const, rotate: '15deg',  tx: 40,   ty: -40 },
  { color: Colors.lime,   icon: 'users' as const,        rotate: '-8deg',  tx: -20,  ty: -10 },
  { color: Colors.purple, icon: 'clipboard' as const,    rotate: '5deg',   tx: 10,   ty: 20  },
];

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUserName, setOnboarded } = useSettingsStore();

  async function handleStart() {
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await setUserName(name.trim() || 'Friend');
      await setOnboarded();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Stacked notch cards */}
        <View style={styles.cardStack}>
          {CARDS.map((card, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(i * 120).springify().damping(SpringConfig.damping).stiffness(SpringConfig.stiffness)}
              style={[
                styles.cardWrap,
                {
                  transform: [
                    { rotate: card.rotate },
                    { translateX: card.tx },
                    { translateY: card.ty },
                  ],
                  zIndex: CARDS.length - i,
                },
              ]}
            >
              <NotchCard color={card.color} icon={card.icon} style={styles.card}>
                <AppText variant="label" color={Colors.onAccent} style={{ marginTop: 8 }}>
                  {i === 0 ? '6 Tasks' : i === 1 ? 'Team Tasks' : 'My Tasks'}
                </AppText>
              </NotchCard>
            </Animated.View>
          ))}
        </View>

        {/* Copy */}
        <Animated.View entering={FadeInDown.delay(400).duration(300)} style={styles.copy}>
          <AppText variant="h1" color={Colors.text} style={styles.headline}>
            Manage your daily tasks
          </AppText>
          <AppText variant="body" color={Colors.textMuted} style={styles.subtitle}>
            Everything you need to do, right where you need it.
          </AppText>
        </Animated.View>

        {/* Name input */}
        <Animated.View entering={FadeInDown.delay(520).duration(300)} style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Your name (optional)"
            placeholderTextColor={Colors.textFaint}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleStart}
            maxLength={40}
          />
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(640).duration(300)} style={styles.cta}>
          <Button
            label="Get Started"
            onPress={handleStart}
            loading={loading}
            fullWidth
            size="lg"
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenH,
    paddingTop: 60,
    paddingBottom: 48,
  },
  cardStack: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardWrap: {
    position: 'absolute',
    width: 180,
    height: 200,
  },
  card: {
    flex: 1,
  },
  copy: {
    marginBottom: Spacing.s5,
  },
  headline: {
    marginBottom: Spacing.s2,
  },
  subtitle: {
    lineHeight: 22,
  },
  inputWrap: {
    marginBottom: Spacing.s4,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.s4,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cta: {
    marginTop: 'auto',
    paddingTop: Spacing.s4,
  },
});
