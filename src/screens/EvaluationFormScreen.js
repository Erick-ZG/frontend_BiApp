// src/screens/EvaluationFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchKpisForMigraine, createEvaluation, updateEvaluation } from '../api';
import { theme } from '../theme';

// -------------------- opciones chips --------------------
const TRI_STATE_OPTIONS = [
  { value: 'YES', label: 'Sí' },
  { value: 'NO', label: 'No' },
  { value: 'INCONCLUSIVE', label: 'No concluyente' },
];

const ACUTE_MED_TYPE_OPTIONS = [
  { value: 'NSAID_ANALGESICS', label: 'AINE/Analgésicos' },
  { value: 'TRIPTANS', label: 'Triptanes' },
  { value: 'ERGOT', label: 'Ergotamínicos' },
  { value: 'COMBINATION', label: 'Combinados' },
  { value: 'OPIOIDS', label: 'Opioides' },
  { value: 'GEPANTS_DITANS', label: 'Gepants/Ditans' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'INCONCLUSIVE', label: 'No concluyente' },
];

// ✅ selects controlados por CODE
const SELECT_BY_CODE = {
  MEETS_CM_CRITERIA: TRI_STATE_OPTIONS,
  ACUTE_MEDICATION_TYPE: ACUTE_MED_TYPE_OPTIONS,
};

// ✅ Agrupación + orden lógico (triestado después de días)
const KPI_GROUPS = [
  {
    key: 'freq',
    title: 'Frecuencia (últimos 30 días)',
    codes: ['HEADACHE_DAYS_MONTH', 'MIGRAINE_DAYS_MONTH', 'MEETS_CM_CRITERIA'],
  },
  {
    key: 'history',
    title: 'Historia del patrón',
    codes: ['HEADACHE_DURATION_MONTHS'],
  },
  {
    key: 'treatment',
    title: 'Tratamiento / medicación',
    codes: ['ACUTE_MEDICATION_DAYS_MONTH', 'ACUTE_MEDICATION_TYPE'],
  },
  {
    key: 'impact',
    title: 'Severidad / impacto',
    codes: ['PAIN_INTENSITY_AVG', 'DISABILITY_MIDAS'],
  },
];

// textos finales (sin triestado)
const DISPLAY_BY_CODE = {
  MEETS_CM_CRITERIA: {
    name: 'En >=8 dias/mes el dolor cumplio criterio de migrana?',
    description:
      'Selecciona segun criterio clinico. Util si "Dias con migrana/mes" es dudoso o incompleto.',
  },
};

// Formatea fecha a AAAA-MM-DD usando componentes locales
const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse seguro para string ISO del backend (toma solo la parte de fecha)
const parseApiDate = (val) => {
  if (!val) return new Date();
  const raw = typeof val === 'string' ? val.slice(0, 10) : '';
  return new Date(`${raw}T00:00:00`);
};

// Componente chips
function ChipSelect({ value, options, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Header colapsable
function GroupHeader({ title, subtitle, open, onToggle, count }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85} style={styles.groupHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.groupTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.groupSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.groupHeaderRight}>
        <Text style={styles.groupMeta}>{count} campos</Text>
        <Text style={styles.groupChevron}>{open ? '▾' : '▸'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PrimaryButton({ title, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function EvaluationFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { patient, evaluation = null } = route.params;
  const isEdit = !!evaluation;

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [kpis, setKpis] = useState([]);
  const [kpiValues, setKpiValues] = useState({});

  const baseEvalDate = evaluation?.evaluation_date
    ? parseApiDate(evaluation.evaluation_date)
    : new Date();
  const initialEvalDate = formatDateInput(baseEvalDate);
  const [evaluationDate, setEvaluationDate] = useState(initialEvalDate);
  const [evalDateObj, setEvalDateObj] = useState(baseEvalDate);
  const [showEvalDatePicker, setShowEvalDatePicker] = useState(false);

  // ✅ por defecto OFF
  const [hasDisease, setHasDisease] = useState(
    evaluation?.has_disease !== undefined && evaluation?.has_disease !== null
      ? !!evaluation.has_disease
      : false
  );

  // ✅ NO BLOQUEAR: siempre editable
  const [progressPercent, setProgressPercent] = useState(
    evaluation?.progress_percent !== null && evaluation?.progress_percent !== undefined
      ? String(evaluation.progress_percent)
      : ''
  );
  const [doctorNotes, setDoctorNotes] = useState(evaluation?.doctor_notes || '');
  const [saving, setSaving] = useState(false);

  // colapsables
  const [openGroups, setOpenGroups] = useState({
    freq: true,
    history: false,
    treatment: false,
    impact: false,
  });

  useEffect(() => {
    navigation.setOptions({
      title: `${isEdit ? 'Editar eval.' : 'Nueva eval.'} - ${patient.first_name}`,
    });
    loadKpis();
  }, []);

  // Prefill KPIs si viene una evaluaci?n previa
  useEffect(() => {
    if (!evaluation || kpis.length === 0) return;
    setKpiValues((prev) => {
      const next = { ...prev };
      if (Array.isArray(evaluation.kpi_values)) {
        evaluation.kpi_values.forEach((kv) => {
          const value =
            kv.value_numeric !== null && kv.value_numeric !== undefined
              ? kv.value_numeric
              : kv.value_string !== null && kv.value_string !== undefined
              ? kv.value_string
              : kv.value_boolean !== null && kv.value_boolean !== undefined
              ? kv.value_boolean
              : null;
          if (kv.kpi_id && value !== null) {
            next[kv.kpi_id] = value;
          }
        });
      }
      return next;
    });
  }, [evaluation, kpis]);

  async function loadKpis() {
    try {
      setLoadingKpis(true);
      const data = await fetchKpisForMigraine();
      const items = Array.isArray(data.data) ? data.data : data;
      setKpis(items);
    } catch (error) {
      console.error('Error loading KPIs', error);
      Alert.alert('Error', 'No se pudieron cargar los KPIs');
    } finally {
      setLoadingKpis(false);
    }
  }

  const onChangeEvalDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowEvalDatePicker(false);
    if (selectedDate) {
      setEvalDateObj(selectedDate);
      setEvaluationDate(formatDateInput(selectedDate));
      setHistoryReset(false);
    }
  };

  const handleChangeKpiValue = (kpiId, kpiType, rawValue) => {
    setKpiValues((prev) => ({
      ...prev,
      [kpiId]: kpiType === 'boolean' ? !!rawValue : rawValue,
    }));
  };

  // orden interno por grupo freq para que el triestado vaya al final
  const sortGroup = (groupKey, arr) => {
    if (groupKey !== 'freq') return arr;
    const order = ['HEADACHE_DAYS_MONTH', 'MIGRAINE_DAYS_MONTH', 'MEETS_CM_CRITERIA'];
    return [...arr].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  };

  const handleSubmit = async () => {
    if (saving) return;

    try {
      const errors = [];

      // Helper: usa valueByCode (se llenará luego)
      const getNumericFromCodes = (valueByCode, ...codes) => {
        for (const c of codes) {
          const v = valueByCode[c];
          if (v !== undefined && v !== null && v !== '') {
            const n = Number(v);
            if (!Number.isNaN(n)) return n;
          }
        }
        return null;
      };

      // ---------- Validación de fecha ----------
      if (!evaluationDate) {
        errors.push('Ingresa una fecha de evaluación en formato AAAA-MM-DD.');
      } else {
        const d = new Date(evaluationDate + 'T00:00:00');
        if (Number.isNaN(d.getTime())) errors.push('La fecha de evaluación no es válida.');
        else {
          const today = new Date();
          const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (d > todayMid) errors.push('La fecha de evaluación no puede ser futura.');
        }
      }

      // ---------- Progreso: solo valida si escribió algo ----------
      let parsedProgress = null;
      if (progressPercent !== '') {
        parsedProgress = Number(progressPercent);
        if (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
          errors.push('El porcentaje de avance debe estar entre 0 y 100.');
        }
      }

      // ---------- KPIs ----------
      const kpisPayload = [];
      const valueByCode = {};

      for (const kpi of kpis) {
        const raw = kpiValues[kpi.id];

        const forcedOptions = SELECT_BY_CODE[kpi.code];
        if (forcedOptions) {
          if (raw !== undefined && raw !== null && raw !== '') {
            const val = String(raw);
            valueByCode[kpi.code] = val;
            kpisPayload.push({ kpi_id: kpi.id, value_string: val });
          }
          continue;
        }

        if (kpi.type === 'boolean') {
          if (raw !== undefined) {
            const boolVal = !!raw;
            valueByCode[kpi.code] = boolVal;
            kpisPayload.push({ kpi_id: kpi.id, value_boolean: boolVal });
          }
          continue;
        }

        if (raw === undefined || raw === '' || raw === null) continue;

        if (kpi.type === 'integer' || kpi.type === 'float') {
          const limitMin = kpi.code === 'HEADACHE_DURATION_MONTHS' ? 1 : kpi.min_value;
          const limitMax = kpi.code === 'HEADACHE_DURATION_MONTHS' ? 240 : kpi.max_value;
          const numVal = Number(raw);
          if (Number.isNaN(numVal)) {
            errors.push(`"${kpi.name}" debe ser un numero.`);
            continue;
          }
          if (limitMin !== null && numVal < limitMin) errors.push(`"${kpi.name}" no puede ser menor que ${limitMin}.`);
          if (limitMax !== null && numVal > limitMax) errors.push(`"${kpi.name}" no puede ser mayor que ${limitMax}.`);

          valueByCode[kpi.code] = numVal;
          kpisPayload.push({ kpi_id: kpi.id, value_numeric: numVal });
          continue;
        }

        const str = String(raw);
        valueByCode[kpi.code] = str;
        kpisPayload.push({ kpi_id: kpi.id, value_string: str });
      }

      // ✅ Validación lógica DESPUÉS de llenar valueByCode
      const headacheDays = getNumericFromCodes(valueByCode, 'HEADACHE_DAYS_MONTH');
      const migraineDays = getNumericFromCodes(valueByCode, 'MIGRAINE_DAYS_MONTH');

      if (headacheDays !== null && migraineDays !== null && migraineDays > headacheDays) {
        errors.push(
          `Los "Días con migraña al mes" (${migraineDays}) no pueden ser mayores que los "Días de cefalea al mes" (${headacheDays}).`
        );
      }

      const hasValue = (code) => {
        const v = valueByCode[code];
        return v !== undefined && v !== null && v !== '';
      };

      const freqCodes = ['HEADACHE_DAYS_MONTH', 'MIGRAINE_DAYS_MONTH', 'MEETS_CM_CRITERIA'];
      const treatmentCodes = ['ACUTE_MEDICATION_DAYS_MONTH', 'ACUTE_MEDICATION_TYPE'];

      const freqFilled = freqCodes.some(hasValue);
      const freqComplete = freqCodes.every(hasValue);
      const treatmentFilled = treatmentCodes.some(hasValue);
      const treatmentComplete = treatmentCodes.every(hasValue);

      if (freqFilled && !freqComplete) {
        errors.push('Completa todos los campos de Frecuencia (dias de cefalea, dias de migrana y criterio).');
      }

      if (freqFilled && !hasValue('HEADACHE_DURATION_MONTHS')) {
        errors.push('Completa el campo de Historia del patron cuando registras datos de Frecuencia.');
      }

      if (treatmentFilled && !treatmentComplete) {
        errors.push('Completa todos los campos de Tratamiento/medicacion (dias de medicacion y tipo).');
      }

      if (!freqComplete && !treatmentComplete) {
        errors.push('Para guardar completa Frecuencia o Tratamiento/medicacion (uno de los dos grupos).');
      }

      
      if (errors.length > 0) {
        Alert.alert('Validacion', errors.join('\n'));
        return;
      }

      // Construir payload final (igual que antes)
      const payload = {
        patient_id: patient.id,
        disease_id: 1,
        doctor_id: null,
        evaluation_date: evaluationDate,

        has_disease: hasDisease,
        progress_percent: parsedProgress,
        disease_stage: null,
        doctor_notes: doctorNotes || null,
         headache_days_month: headacheDays,
        migraine_days_month: migraineDays,
        acute_medication_days_month: getNumericFromCodes(valueByCode, 'ACUTE_MEDICATION_DAYS_MONTH'),
        pain_intensity_avg: getNumericFromCodes(valueByCode, 'PAIN_INTENSITY_AVG', 'PAIN_INTENSITY_VAS'),
        disability_score: getNumericFromCodes(valueByCode, 'DISABILITY_MIDAS'),

        kpis: kpisPayload,
      };

      setSaving(true);
      if (isEdit && evaluation?.id) {
        await updateEvaluation(evaluation.id, payload);
        Alert.alert('Exito', 'Evaluacion actualizada correctamente.');
      } else {
        await createEvaluation(payload);
        Alert.alert('Exito', 'Evaluacion guardada correctamente.');
      }
      navigation.goBack();
    } catch (err) {
      console.error('handleSubmit error', err);
      Alert.alert('Error', 'Ocurrio un error inesperado. Revisa la consola.');
    } finally {
      setSaving(false);
    }
  };


  if (loadingKpis) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando KPIs...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Nueva evaluación</Text>
      <Text style={styles.subTitle}>
        Paciente: {patient.first_name} {patient.last_name}
      </Text>

      {/* Datos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos de la evaluación</Text>

        <Text style={styles.label}>Fecha de evaluación</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowEvalDatePicker(true)} activeOpacity={0.85}>
          <Text style={evaluationDate ? styles.dateText : styles.datePlaceholder}>
            {evaluationDate || 'Selecciona fecha'}
          </Text>
        </TouchableOpacity>

        {showEvalDatePicker && (
          <DateTimePicker
            value={evalDateObj}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onChangeEvalDate}
          />
        )}
      </View>

      {/* KPIs */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>KPIs clinicos</Text>
{KPI_GROUPS.map((group) => {
          const groupKpisRaw = kpis.filter((k) => group.codes.includes(k.code));
          if (groupKpisRaw.length === 0) return null;

          const groupKpis = sortGroup(group.key, groupKpisRaw);
          const open = !!openGroups[group.key];

          return (
            <View key={group.key} style={styles.groupCard}>
              <GroupHeader
                title={group.title}
                open={open}
                count={groupKpis.length}
                onToggle={() => setOpenGroups((p) => ({ ...p, [group.key]: !p[group.key] }))}
              />

              {open && (
                <View style={{ paddingBottom: 6 }}>
                  {groupKpis.map((kpi) => {
                    const value = kpiValues[kpi.id];
                    const forcedOptions = SELECT_BY_CODE[kpi.code];

                    const display = DISPLAY_BY_CODE[kpi.code] || {};
                    const name = display.name || kpi.name;
                    const desc = display.description || kpi.description;

                    // select por code
                    if (forcedOptions) {
                      return (
                        <View key={kpi.id} style={styles.field}>
                          <Text style={styles.label}>{name}</Text>
                          {!!desc && <Text style={styles.helper}>{desc}</Text>}
                          <ChipSelect
                            value={value || null}
                            options={forcedOptions}
                            onChange={(v) => handleChangeKpiValue(kpi.id, 'string', v)}
                          />
                        </View>
                      );
                    }

                    // boolean
                    if (kpi.type === 'boolean') {
                      return (
                        <View key={kpi.id} style={[styles.field, styles.rowBetween]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{name}</Text>
                            {!!desc && <Text style={styles.helper}>{desc}</Text>}
                          </View>
                          <Switch
                            value={!!value}
                            onValueChange={(v) => handleChangeKpiValue(kpi.id, kpi.type, v)}
                          />
                        </View>
                      );
                    }

                    // numeric input
                    return (
                      <View key={kpi.id} style={styles.field}>
                        <Text style={styles.label}>{name}</Text>
                        {!!desc && <Text style={styles.helper}>{desc}</Text>}

                        {(() => {
                          const displayMin = kpi.code === 'HEADACHE_DURATION_MONTHS' ? 1 : kpi.min_value;
                          const displayMax = kpi.code === 'HEADACHE_DURATION_MONTHS' ? 240 : kpi.max_value;
                          if (displayMin !== null || displayMax !== null) {
                            return (
                              <Text style={styles.helper}>
                                Rango: {displayMin ?? 'sin min'} - {displayMax ?? 'sin max'}
                                {kpi.unit ? ` ${kpi.unit}` : ''}
                              </Text>
                            );
                          }
                          if (kpi.unit) {
                            return <Text style={styles.helper}>Unidad: {kpi.unit}</Text>;
                          }
                          return null;
                        })()}

                        <TextInput
                          style={styles.input}
                          keyboardType={(kpi.type === 'integer' || kpi.type === 'float') ? 'numeric' : 'default'}
                          value={value !== undefined && value !== null ? String(value) : ''}
                          onChangeText={(text) => handleChangeKpiValue(kpi.id, kpi.type, text)}
                          placeholder={(kpi.type === 'integer' || kpi.type === 'float') ? 'Ingrese un valor' : 'Ingrese texto'}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Diagnóstico médico */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Diagnóstico del médico</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.diagLabel}>Tiene migraña crónica</Text>
          <Switch value={hasDisease} onValueChange={setHasDisease} />
        </View>

        <Text style={styles.label}>Porcentaje de avance / severidad (0–100)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={progressPercent}
          onChangeText={setProgressPercent}
          placeholder="Ej: 60"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Notas del médico</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          placeholder="Comentarios clinicos, tratamiento, etc."
          placeholderTextColor="#9ca3af"
        />
      </View>

      <PrimaryButton
        title={saving ? (isEdit ? 'Actualizando...' : 'Guardando...') : isEdit ? 'Guardar cambios' : 'Guardar evaluación'}
        onPress={handleSubmit}
        disabled={saving}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ORANGE = theme.colors.primary;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 26,
    backgroundColor: theme.colors.bg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

  title: { fontSize: 20, fontWeight: '900', marginBottom: 4, color: '#111827' },
  subTitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },

  card: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  cardTitle: { fontWeight: '900', marginBottom: 8, fontSize: 15, color: '#111827' },

  label: { fontWeight: '800', color: '#111827' },
  helper: { fontSize: 12, color: '#6b7280', marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: theme.colors.card,
  },
  textArea: { height: 90, textAlignVertical: 'top' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },

  dateText: { color: '#111827', fontWeight: '700' },
  datePlaceholder: { color: '#9ca3af' },

  // grupos
  groupCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
  },
  groupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupTitle: { fontWeight: '900', fontSize: 13, color: ORANGE },
  groupSubtitle: { marginTop: 2, fontSize: 11, color: '#6b7280' },
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupMeta: { fontSize: 11, color: '#6b7280' },
  groupChevron: { fontSize: 16, color: ORANGE },

  field: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },

  diagLabel: { color: '#111827', fontWeight: '900' },

  // chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primarySoft,
  },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipText: { fontSize: 12, color: '#7c2d12', fontWeight: '700' },
  chipTextActive: { color: '#fff', fontWeight: '900' },

  // botón
  primaryBtn: {
    marginTop: 6,
    marginBottom: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
});













