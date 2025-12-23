// src/screens/EvaluationDetailScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { fetchAiDiagnoses, runAiForEvaluation, selectAiDiagnosis } from '../api';
import { theme } from '../theme';

const formatLocalDate = (val) => {
  if (!val) return '';
  const raw = String(val).slice(0, 10);
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(val);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function EvaluationDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { patient, evaluation } = route.params;

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [diagnoses, setDiagnoses] = useState([]);
  const [error, setError] = useState(null);
  const [selectedDiagId, setSelectedDiagId] = useState(null);

  const formattedEvalDate = useMemo(
    () => formatLocalDate(evaluation.evaluation_date),
    [evaluation.evaluation_date]
  );

  useEffect(() => {
    navigation.setOptions({
      title: `Analisis IA - Eval. ${evaluation.id}`,
    });
    loadDiagnoses();
  }, []);

  async function loadDiagnoses() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAiDiagnoses(evaluation.id);
      const list = Array.isArray(data) ? data : [];
      setDiagnoses(list);
      const selected = list.find((d) => d.selected_by_doctor);
      setSelectedDiagId(selected ? selected.id : null);
    } catch (err) {
      console.error('Error loading AI diagnoses', err);
      setError('No se pudieron cargar los diagnosticos IA.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAi() {
    try {
      setRunning(true);
      setError(null);
      await runAiForEvaluation(evaluation.id);
      await loadDiagnoses();
    } catch (err) {
      console.error('Error running AI', err);
      Alert.alert('Error', 'Ocurrio un error al ejecutar el analisis con IA.');
    } finally {
      setRunning(false);
    }
  }

  async function handleSelect(diagId) {
    try {
      await selectAiDiagnosis(diagId);
      setSelectedDiagId(diagId);
      setDiagnoses((prev) =>
        prev.map((d) => ({
          ...d,
          selected_by_doctor: d.id === diagId,
        }))
      );
      Alert.alert('Listo', 'Marcado como diagnostico mas acertado.');
    } catch (err) {
      console.error('Error selecting AI diagnosis', err);
      Alert.alert('Error', 'No se pudo marcar el diagnostico.');
    }
  }

  const azureDiag = useMemo(
    () => diagnoses.find((d) => (d.ai_tool?.name || '').toLowerCase().includes('azure')),
    [diagnoses]
  );
  const perplexityDiag = useMemo(
    () => diagnoses.find((d) => (d.ai_tool?.name || '').toLowerCase().includes('perplexity')),
    [diagnoses]
  );

  const getKpiValue = (code) => {
    const list = evaluation.kpi_values || [];
    const kv = list.find(
      (item) =>
        item.kpi?.code === code ||
        item.code === code
    );
    if (!kv) return null;
    if (kv.value_numeric !== null && kv.value_numeric !== undefined) return kv.value_numeric;
    if (kv.value_string !== null && kv.value_string !== undefined) return kv.value_string;
    if (kv.value_boolean !== null && kv.value_boolean !== undefined) return kv.value_boolean;
    return null;
  };

  const sections = useMemo(() => {
    const blocks = [];

    const freq = [];
    if (evaluation.headache_days_month !== null && evaluation.headache_days_month !== undefined) {
      freq.push(`Dias cefalea/mes: ${evaluation.headache_days_month}`);
    }
    if (evaluation.migraine_days_month !== null && evaluation.migraine_days_month !== undefined) {
      freq.push(`Dias migrana/mes: ${evaluation.migraine_days_month}`);
    }
    const meets = getKpiValue('MEETS_CM_CRITERIA');
    if (meets) {
      const map = { YES: 'Si', NO: 'No', INCONCLUSIVE: 'No concluyente' };
      freq.push(`Cumple criterio MC: ${map[meets] || meets}`);
    }
    if (freq.length) blocks.push({ title: 'Frecuencia', items: freq });

    const history = [];
    const dur = getKpiValue('HEADACHE_DURATION_MONTHS');
    if (dur !== null && dur !== undefined) history.push(`Duracion del patron (meses): ${dur}`);
    if (history.length) blocks.push({ title: 'Historia del patron', items: history });

    const treatment = [];
    if (evaluation.acute_medication_days_month !== null && evaluation.acute_medication_days_month !== undefined) {
      treatment.push(`Dias de medicacion aguda/mes: ${evaluation.acute_medication_days_month}`);
    }
    const medType = getKpiValue('ACUTE_MEDICATION_TYPE');
    if (medType) treatment.push(`Tipo de medicacion aguda: ${medType}`);
    if (evaluation.medication_overuse_suspected !== null && evaluation.medication_overuse_suspected !== undefined) {
      treatment.push(`Sobreuso sospechado: ${evaluation.medication_overuse_suspected ? 'Si' : 'No'}`);
    }
    if (treatment.length) blocks.push({ title: 'Tratamiento / medicacion', items: treatment });

    const impact = [];
    if (evaluation.pain_intensity_avg !== null && evaluation.pain_intensity_avg !== undefined) {
      impact.push(`Intensidad promedio del dolor: ${evaluation.pain_intensity_avg}/10`);
    }
    if (evaluation.disability_score !== null && evaluation.disability_score !== undefined) {
      impact.push(`Discapacidad (MIDAS): ${evaluation.disability_score}`);
    }
    if (evaluation.progress_percent !== null && evaluation.progress_percent !== undefined) {
      impact.push(`Progreso / severidad: ${evaluation.progress_percent}%`);
    }
    if (impact.length) blocks.push({ title: 'Impacto', items: impact });

    const features = [];
    if (evaluation.aura_presence !== null && evaluation.aura_presence !== undefined) {
      features.push(`Aura habitual: ${evaluation.aura_presence ? 'Si' : 'No'}`);
    }
    if (features.length) blocks.push({ title: 'Caracteristicas', items: features });

    const doctor = [];
    if (evaluation.has_disease !== null && evaluation.has_disease !== undefined) {
      doctor.push(`Tiene migrana cronica: ${evaluation.has_disease ? 'Si' : 'No'}`);
    }
    if (evaluation.doctor_notes) {
      doctor.push(`Notas del medico: ${evaluation.doctor_notes}`);
    }
    if (doctor.length) blocks.push({ title: 'Criterio clinico', items: doctor });

    return blocks;
  }, [evaluation]);

  const renderDiagCard = (diag, label) => {
    if (!diag) {
      return (
        <View style={styles.aiCardEmpty}>
          <Text style={styles.aiLabel}>{label}</Text>
          <Text style={styles.aiEmptyText}>
            Aun no hay diagnostico de esta IA. Pulsa "Generar diagnosticos con IA" para obtenerlo.
          </Text>
        </View>
      );
    }

    const isSelected = diag.id === selectedDiagId || !!diag.selected_by_doctor;

    return (
      <View style={[styles.aiCard, isSelected && styles.aiCardSelected]}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiLabel}>
            {label} {diag.ai_tool?.name ? `(${diag.ai_tool.name})` : ''}
          </Text>
          {isSelected && <Text style={styles.badge}>Elegido</Text>}
        </View>
        <Text style={styles.aiSubLabel}>Diagnostico / analisis</Text>
        <View style={styles.aiResponseBox}>
          <Text style={styles.aiText}>{diag.response_text}</Text>
        </View>

        <TouchableOpacity
          style={[styles.selectButton, isSelected && styles.selectButtonActive]}
          onPress={() => handleSelect(diag.id)}
        >
          <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextActive]}>
            {isSelected ? 'Marcado como diagnostico mas acertado' : 'Marcar como diagnostico mas acertado'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Resumen de la evaluacion (solo campos llenados) */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Resumen de la evaluacion</Text>
        <Text style={styles.line}>
          Paciente: {patient.first_name} {patient.last_name}
        </Text>
        <Text style={styles.line}>Fecha evaluacion: {formattedEvalDate || '-'}</Text>
        {sections.map((sec) => (
          <View key={sec.title} style={{ marginTop: 8 }}>
            <Text style={styles.sectionLabel}>{sec.title}</Text>
            {sec.items.map((txt, idx) => (
              <Text key={idx} style={styles.line}>
                - {txt}
              </Text>
            ))}
          </View>
        ))}
        {sections.length === 0 && <Text style={styles.line}>No hay datos registrados en esta evaluacion.</Text>}
      </View>

      {/* Boton para ejecutar IA */}
      <View style={styles.block}>
        <TouchableOpacity
          style={[styles.runButton, (running || loading) && styles.runButtonDisabled]}
          onPress={handleRunAi}
          disabled={running || loading}
        >
          {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.runButtonText}>Generar diagnosticos con IA</Text>}
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Diagnosticos IA */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text>Cargando diagnosticos IA...</Text>
        </View>
      ) : (
        <>
          {renderDiagCard(azureDiag, 'IA 1 - Azure OpenAI')}
          {renderDiagCard(perplexityDiag, 'IA 2 - Perplexity')}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  block: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    elevation: 1,
  },
  blockTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 15,
  },
  line: {
    fontSize: 13,
    marginBottom: 2,
    color: theme.colors.text,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  errorText: {
    marginTop: 8,
    color: theme.colors.danger,
    fontSize: 12,
  },
  aiCard: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  aiCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  aiCardEmpty: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5f5',
    backgroundColor: theme.colors.card,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiLabel: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: theme.colors.text,
  },
  aiSubLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  aiEmptyText: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  aiResponseBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.card,
    marginBottom: 8,
  },
  aiText: { color: theme.colors.text },
  selectButton: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  selectButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  selectButtonTextActive: {
    color: '#fff',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primary,
    color: '#fff',
    borderRadius: 999,
    fontSize: 11,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 2,
    fontSize: 13,
  },
});






