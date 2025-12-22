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
        return db - da; // descendente (mas reciente primero)
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

  // Card de evaluacion con acciones
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
            style={[styles.evalBtn, styles.evalBtnSecondary]}
            onPress={() => navigation.navigate('NewEvaluation', { patient, evaluation: item })}
          >
            <Text style={styles.evalBtnText}>{'\u270f\uFE0F'} Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.evalBtn, styles.evalBtnDanger]} onPress={handleDeleteEval}>
            <Text style={styles.evalBtnText}>{'\u{1f5d1}'} Eliminar</Text>
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

      {/* Botones de edicion / eliminacion */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => navigation.navigate('PatientForm', { patient })}>
          <Text style={styles.buttonText}>Editar paciente</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {/* Nueva evaluacion */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => navigation.navigate('NewEvaluation', { patient })}>
          <Text style={styles.buttonText}>+ Nueva evaluacion</Text>
        </TouchableOpacity>
      </View>

      {/* Boton: evolucion de KPIs */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.buttonAnalytics]} onPress={() => navigation.navigate('KpiTrend', { patient })}>
          <Text style={styles.buttonText}>Ver evolucion de KPIs</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Evaluaciones</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text>Cargando evaluaciones...</Text>
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
  container: { flex: 1, padding: 16 },
  headerCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  subText: { fontSize: 13, color: '#555' },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonSecondary: {
    backgroundColor: '#22c55e',
  },
  buttonDanger: {
    backgroundColor: '#dc2626',
  },
  // color distinto para el boton de analisis
  buttonAnalytics: {
    backgroundColor: '#0ea5e9',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  evalCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    marginBottom: 12,
  },
  evalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  evalTitle: { fontWeight: '900', marginBottom: 2, color: '#7c2d12' },
  evalSub: { color: '#7c2d12', fontSize: 12 },
  evalBody: { gap: 2, marginBottom: 10 },
  evalLine: { color: '#5b3417', fontSize: 12 },
  evalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  evalBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  evalBtnSecondary: {
    backgroundColor: '#fcd34d',
  },
  evalBtnDanger: {
    backgroundColor: '#dc2626',
  },
  evalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  chipAi: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f97316',
    borderRadius: 999,
  },
  chipAiText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  emptyText: { marginTop: 8, color: '#555' },
});
