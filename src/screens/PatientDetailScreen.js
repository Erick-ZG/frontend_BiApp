// src/screens/PatientDetailScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchPatientEvaluations, deletePatient, deleteEvaluation } from '../api';
import { theme } from '../theme';

const formatLocalDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() + tzOff).toISOString().slice(0, 10);
};

export default function PatientDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { patient } = route.params;

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadEvaluations() {
    try {
      setLoading(true);
      const data = await fetchPatientEvaluations(patient.id);
      let list = Array.isArray(data) ? data : [];
      list = [...list].sort((a, b) => {
        const da = a.evaluation_date ? new Date(a.evaluation_date) : 0;
        const db = b.evaluation_date ? new Date(b.evaluation_date) : 0;
        return db - da;
      });
      setEvaluations(list);
    } catch (error) {
      console.error('Error loading evaluations', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    navigation.setOptions({
      title: `${patient.first_name} ${patient.last_name}`,
    });
  }, [navigation, patient.first_name, patient.last_name]);

  useFocusEffect(
    useCallback(() => {
      loadEvaluations();
    }, [patient.id])
  );

  const handleDelete = () => {
    Alert.alert(
      'Confirmar eliminacion',
      'Seguro que deseas eliminar este paciente? Se eliminaran tambien sus evaluaciones.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePatient(patient.id);
              Alert.alert('Listo', 'Paciente eliminado.');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting patient', error);
              Alert.alert('Error', 'No se pudo eliminar el paciente.');
            }
          },
        },
      ]
    );
  };

  const renderEvaluation = ({ item }) => {
    const dateLabel = formatLocalDate(item.evaluation_date);
    const doctorSummary =
      item.doctor_notes && item.doctor_notes.trim().length > 0
        ? item.doctor_notes.trim()
        : 'Sin notas medicas';

    const handleDeleteEval = () => {
      Alert.alert(
        'Eliminar evaluacion',
        'Seguro que deseas eliminar esta evaluacion?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteEvaluation(item.id);
                Alert.alert('Listo', 'Evaluacion eliminada.');
                loadEvaluations();
              } catch (error) {
                console.error('Error deleting evaluation', error);
                Alert.alert('Error', 'No se pudo eliminar la evaluacion.');
              }
            },
          },
        ]
      );
    };

    return (
      <View style={styles.evalCard}>
        <View style={styles.evalHeaderRow}>
          <View>
            <Text style={styles.evalTitle}>
              Evaluacion {item.id} {dateLabel ? `- ${dateLabel}` : ''}
            </Text>
            <Text style={styles.evalSub}>
              Tiene enfermedad:{' '}
              {item.has_disease === null ? 'Sin especificar' : item.has_disease ? 'Si' : 'No'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.chipAi}
            onPress={() =>
              navigation.navigate('EvaluationDetail', {
                patient,
                evaluation: item,
              })
            }
          >
            <Text style={styles.chipAiText}>Analizar con IA</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.evalBody}>
          {item.progress_percent !== null && (
            <Text style={styles.evalLine}>Progreso / severidad: {item.progress_percent}%</Text>
          )}
          <Text style={styles.evalLine}>Resumen medico: {doctorSummary}</Text>
        </View>

        <View style={styles.evalActions}>
          <TouchableOpacity
            style={[styles.evalBtn, styles.evalBtnPrimary]}
            onPress={() => navigation.navigate('NewEvaluation', { patient, evaluation: item })}
          >
            <Text style={styles.evalBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.evalBtn, styles.evalBtnDanger]} onPress={handleDeleteEval}>
            <Text style={styles.evalBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.name}>
          {patient.first_name} {patient.last_name}
        </Text>
        {patient.document_number && <Text style={styles.subText}>Doc: {patient.document_number}</Text>}
        {patient.email && <Text style={styles.subText}>{patient.email}</Text>}
        {patient.phone && <Text style={styles.subText}>{patient.phone}</Text>}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => navigation.navigate('PatientForm', { patient })}>
          <Text style={styles.buttonText}>Editar paciente</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => navigation.navigate('NewEvaluation', { patient })}>
          <Text style={styles.buttonText}>Nueva evaluacion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={() => navigation.navigate('KpiTrend', { patient })}>
          <Text style={styles.buttonGhostText}>Ver evolucion de KPIs</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Evaluaciones</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.mutedText}>Cargando evaluaciones...</Text>
        </View>
      ) : evaluations.length === 0 ? (
        <Text style={styles.emptyText}>Aun no hay evaluaciones registradas para este paciente.</Text>
      ) : (
        <FlatList data={evaluations} keyExtractor={(item) => String(item.id)} renderItem={renderEvaluation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.md, backgroundColor: theme.colors.bg },
  headerCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  name: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  subText: { fontSize: 13, color: theme.colors.muted },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: theme.colors.primary },
  buttonSecondary: { backgroundColor: theme.colors.accent },
  buttonDanger: { backgroundColor: theme.colors.danger },
  buttonGhost: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  buttonGhostText: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  mutedText: { color: theme.colors.muted, fontSize: 13 },
  evalCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.sm,
  },
  evalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  evalTitle: { fontWeight: '800', marginBottom: 2, color: theme.colors.text },
  evalSub: { color: theme.colors.muted, fontSize: 12 },
  evalBody: { gap: 2, marginBottom: theme.spacing.sm },
  evalLine: { color: theme.colors.text, fontSize: 12 },
  evalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  evalBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  evalBtnPrimary: { backgroundColor: theme.colors.primary },
  evalBtnDanger: { backgroundColor: theme.colors.danger },
  evalBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  chipAi: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
  },
  chipAiText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  emptyText: { marginTop: theme.spacing.sm, color: theme.colors.muted },
});
