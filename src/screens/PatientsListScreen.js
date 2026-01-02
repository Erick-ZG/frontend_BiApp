// src/screens/PatientsListScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { fetchPatients } from '../api';
import { theme } from '../theme';

export default function PatientsListScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPatients() {
    try {
      setLoading(true);
      const data = await fetchPatients();
      const items = Array.isArray(data.data) ? data.data : data;
      setPatients(items);
    } catch (error) {
      console.error('Error loading patients', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isFocused) loadPatients();
  }, [isFocused]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Pacientes',
      headerRight: () => null,
    });
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PatientDetail', { patient: item })}
      activeOpacity={0.9}
    >
      <Text style={styles.name}>
        {item.first_name} {item.last_name}
      </Text>
      {item.document_number ? (
        <Text style={styles.subText}>Doc: {item.document_number}</Text>
      ) : null}
      {item.email ? <Text style={styles.subText}>{item.email}</Text> : null}
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>Pacientes</Text>
      <Text style={styles.heroSubtitle}>
        {'Gestion clinica y seguimiento de evaluaciones'}
      </Text>
      <View style={styles.heroRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>Pacientes</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('PatientForm')}
        >
          <Text style={styles.primaryBtnText}>Nuevo paciente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.mutedText}>Cargando pacientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {patients.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Sin pacientes registrados</Text>
          <Text style={styles.mutedText}>
            {'Crea el primer paciente para iniciar el seguimiento.'}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.primaryBtnFull]}
            onPress={() => navigation.navigate('PatientForm')}
          >
            <Text style={styles.primaryBtnText}>Nuevo paciente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  hero: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 13,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statLabel: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 12,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryBtnFull: {
    width: '100%',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.sm,
  },
  name: { fontWeight: '700', fontSize: 16, color: theme.colors.text },
  subText: { color: theme.colors.muted, fontSize: 13 },
  emptyTitle: { fontWeight: '700', color: theme.colors.text, fontSize: 16 },
  mutedText: { color: theme.colors.muted, fontSize: 13 },
});
