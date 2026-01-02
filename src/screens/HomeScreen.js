// src/screens/HomeScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

const MINI_BARS = [6, 10, 4, 12, 8, 14, 9];

export default function HomeScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Inicio' });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.bgBand} />
      <View style={styles.bgCircle} />

      <View style={styles.hero}>
        <Text style={styles.kicker}>{'Centro cl\u00ednico'}</Text>
        <Text style={styles.title}>{'Migra\u00f1a cr\u00f3nica'}</Text>
        <Text style={styles.subtitle}>
          {'Gesti\u00f3n de pacientes, evaluaciones y an\u00e1lisis cl\u00ednico'}
        </Text>
      </View>

      <View style={styles.mainStack}>
        <View style={styles.blockRow}>
          <TouchableOpacity
            style={[styles.block, styles.blockPrimary, styles.blockHalf]}
            onPress={() => navigation.navigate('PatientsList')}
            activeOpacity={0.9}
          >
            <Text style={styles.blockTitle}>{'Pacientes'}</Text>
            <Text style={styles.blockText}>
              {'Registro, historia y evaluaciones cl\u00ednicas en esta sección'}
            </Text>
            <Text style={[styles.blockLink, styles.blockLinkAuto]}>{'Entrar a pacientes'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.block, styles.blockGhost, styles.blockHalf]}
            onPress={() => navigation.navigate('GlobalDashboard')}
            activeOpacity={0.9}
          >
            <Text style={[styles.blockTitle, styles.blockTitleDark]}>
              {'Dashboard global'}
            </Text>
            <Text style={[styles.blockText, styles.blockTextDark]}>
              {'Indicadores y distribuciones del servicio'}
            </Text>
            <Text style={[styles.blockLink, styles.blockLinkDark, styles.blockLinkAuto]}>
              {'Ver dashboard'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.block, styles.blockGhost]}>
          <Text style={[styles.blockTitle, styles.blockTitleDark]}>
            {'Tip cl\u00ednico'}
          </Text>
          <Text style={[styles.blockText, styles.blockTextDark]}>
            {'Mant\u00e9n la revisi\u00f3n peri\u00f3dica de pacientes con migra\u00f1a cr\u00f3nica.'}
          </Text>
          <View style={styles.miniChart}>
            {MINI_BARS.map((h, idx) => (
              <View key={idx} style={[styles.miniBar, { height: h * 3 }]} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{'Recordatorio'}</Text>
        <Text style={styles.noteText}>
          {'Para crear una evaluaci\u00f3n primero ingresa al paciente.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  bgBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: theme.colors.primarySoft,
    opacity: 0.7,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bgCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -50,
    top: 90,
    backgroundColor: theme.colors.primarySoft,
    opacity: 0.6,
  },
  hero: {
    marginTop: 6,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kicker: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.muted,
    fontSize: 13,
  },
  mainStack: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  blockRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  block: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  blockPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  blockGhost: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  blockHalf: {
    flex: 1,
    minHeight: 150,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  blockTitleDark: {
    color: theme.colors.text,
  },
  blockText: {
    marginTop: 6,
    color: '#fff',
    fontSize: 12,
  },
  blockTextDark: {
    color: theme.colors.muted,
  },
  blockLink: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  blockLinkDark: {
    color: theme.colors.primary,
  },
  blockLinkAuto: {
    marginTop: 'auto',
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 10,
    height: 48,
  },
  miniBar: {
    width: 6,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  noteCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primarySoft,
  },
  noteTitle: {
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  noteText: {
    color: theme.colors.muted,
    fontSize: 12,
  },
});










