// src/screens/GlobalDashboardScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { fetchDashboard } from '../api';
import { theme } from '../theme';

const chartWidth = Dimensions.get('window').width - theme.spacing.md * 4;
const formatDate = (d) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const formatDateShort = (value) => {
  if (!value) return '';
  const raw = String(value);
  const datePart = raw.split('T')[0];
  return datePart || raw;
};
const getRange = (key) => {
  if (!key || key == 'all') return {};
  const days = Number(key);
  if (Number.isNaN(days)) return {};
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { from: formatDate(from), to: formatDate(to) };
};

const LABELS = {
  active_patients: 'Pacientes activos',
  patients_active: 'Pacientes activos',
  total_patients: 'Pacientes totales',
  patients_total: 'Pacientes totales',
  evaluations_count: 'Evaluaciones registradas',
  evaluations_total: 'Evaluaciones registradas',
  total_evaluations: 'Evaluaciones registradas',
  avg_migraine_days: 'Promedio de días con migraña',
  migraine_days_avg: 'Promedio de días con migraña',
  avg_headache_days: 'Promedio de días con cefalea',
  headache_days_avg: 'Promedio de días con cefalea',
  avg_midas: 'Promedio MIDAS',
  midas_avg: 'Promedio MIDAS',
  avg_pain_intensity: 'Promedio de intensidad del dolor',
  pain_intensity_avg: 'Promedio de intensidad del dolor',
  severity_avg: 'Promedio de severidad',
  avg_severity: 'Promedio de severidad',
  acute_med_days_avg: 'Promedio de días de medicación aguda',
  avg_acute_med_days: 'Promedio de días de medicación aguda',
  acute_medication_days_avg: 'Promedio de días de medicación aguda',
  chronic_migraine_rate: 'Tasa de migraña crónica',
  with_disease: 'Con migraña crónica',
  without_disease: 'Sin migraña crónica',
  migraine_days: 'Días con migraña',
  headache_days: 'Días con cefalea',
  midas_histogram: 'Distribución MIDAS',
  acute_medication_types: 'Tipos de medicación aguda',
  acute_med_types: 'Tipos de medicación aguda',
  sex_distribution: 'Distribución por sexo',
  age_distribution: 'Distribución por edad',
  bmi_distribution: 'Distribución por IMC',
  alert_migraine_days: 'Alerta de días con migraña',
  alert_acute_med_days: 'Alerta de medicación aguda',
  alertas: 'Alertas',
};

const ACUTE_MED_LABELS = {
  NSAID_ANALGESICS: 'AINE/Analgésicos',
  ERGOT: 'Ergot',
  TRIPTANS: 'Triptanes',
  COMBINATION_ANALGESICS: 'Analgésicos combinados',
  OTHER: 'Otros',
};

const formatAcuteMedType = (value) => {
  if (!value) return '';
  const key = String(value).toUpperCase();
  return ACUTE_MED_LABELS[key] || String(value);
};

const ensureSexItems = (items) => {
  const map = new Map(items.map((item) => [String(item.label), item]));
  return ['F', 'M', 'O'].map((code) => ({
    label: code,
    count: map.get(code)?.count ?? 0,
  }));
};
const labelize = (key) => {
  if (!key) return '';
  if (LABELS[key]) return LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getItemLabel = (row) =>
  row.label ?? row.name ?? row.bucket ?? row.range ?? row.key ?? row.value ?? '';

const getItemCount = (row) =>
  row.count ?? row.total ?? row.value_count ?? row.n ?? row.value ?? '';

const normalizeItems = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((row) => ({
        label: getItemLabel(row),
        count: getItemCount(row),
      }))
      .filter((row) => row.label !== '' || row.count !== '');
  }
  if (value && typeof value === 'object') {
    const looksLikeRow =
      value.label !== undefined ||
      value.name !== undefined ||
      value.bucket !== undefined ||
      value.range !== undefined ||
      value.count !== undefined ||
      value.total !== undefined ||
      value.value_count !== undefined ||
      value.n !== undefined;
    if (looksLikeRow) {
      return [{ label: getItemLabel(value), count: getItemCount(value) }];
    }
    return Object.entries(value).map(([k, v]) => {
      if (v && typeof v === 'object') {
        return { label: labelize(k), count: getItemCount(v) };
      }
      return { label: labelize(k), count: v };
    });
  }
  return [];
};

const formatDistributionRow = (row) => {
  if (!row || typeof row !== 'object') return String(row ?? '');
  const label = getItemLabel(row);
  const count = getItemCount(row);
  if (label !== undefined && count !== undefined) {
    return `${label}: ${count}`;
  }
  return Object.entries(row)
    .map(([k, v]) => `${labelize(k)}: ${v}`)
    .join(' | ');
};


const toLines = (value) => {
  if (Array.isArray(value)) {
    return value.map(formatDistributionRow).filter(Boolean);
  }
  if (value && typeof value === 'object') {
    const items = normalizeItems(value);
    if (items.length) {
      return items.map((row) => `${row.label}: ${row.count}`);
    }
    return Object.entries(value).map(([k, v]) => {
      if (v && typeof v === 'object') {
        return `${labelize(k)}: ${formatDistributionRow(v)}`;
      }
      return `${labelize(k)}: ${v}`;
    });
  }
  return [String(value ?? '')];
};

const flattenAlertValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'object') return [];
  const values = Object.values(value);
  if (values.some(Array.isArray)) {
    return values.flat().filter(Boolean);
  }
  return values;
};

const formatAlertItem = (item) => {
  if (!item || typeof item !== 'object') return null;
  return {
    evaluationId: item.evaluation_id ?? item.evaluationId ?? item.id ?? '',
    patientName: item.patient_name ?? item.patientName ?? '',
    evaluationDate: formatDateShort(item.evaluation_date ?? item.evaluationDate ?? ''),
    headacheDurationMonths:
      item.headache_duration_months ?? item.headacheDurationMonths ?? '',
    migraineDays: item.migraine_days_month ?? item.migraineDaysMonth ?? '',
    acuteMedDays: item.acute_medication_days_month ?? item.acuteMedicationDaysMonth ?? '',
    acuteMedType: item.acute_medication_type ?? item.acuteMedicationType ?? '',
  };
};

const pickNumber = (row, keys) => {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null && row[k] !== '') {
      return Number(row[k]);
    }
  }
  return null;
};

const SEX_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'F', value: 'F' },
  { label: 'M', value: 'M' },
  { label: 'O', value: 'O' },
];

const DISEASE_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Sï¿½', value: '1' },
  { label: 'No', value: '0' },
];

const RANGE_OPTIONS = [
  { label: 'Últimos 30 días', value: '30' },
  { label: 'Últimos 90 días', value: '90' },
  { label: 'Últimos 180 días', value: '180' },
  { label: 'Último año', value: '365' },
  { label: 'Todo', value: 'all' },
];

const AGE_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: '0-17', value: '0-17' },
  { label: '18-39', value: '18-39' },
  { label: '40-59', value: '40-59' },
  { label: '60+', value: '60-200' },
];

function ChipGroup({ title, options, value, onChange }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function GlobalDashboardScreen() {
  const navigation = useNavigation();
  const [rangeKey, setRangeKey] = useState('90');
  const [sex, setSex] = useState('');
  const [hasDisease, setHasDisease] = useState('');
  const [ageRange, setAgeRange] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const range = getRange(rangeKey);
      const params = { ...range };
      if (sex) params.sex = sex;
      if (hasDisease !== '') params.has_disease = hasDisease;
      if (ageRange) {
        const parts = ageRange.split('-');
        params.min_age = parts[0];
        params.max_age = parts[1];
      }
      const res = await fetchDashboard(params);
      setData(res || null);
    } catch (err) {
      console.error('Error loading dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rangeKey, sex, hasDisease, ageRange]);

  useEffect(() => {
    navigation.setOptions({ title: 'Dashboard global' });
  }, [navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const summaryItems = useMemo(() => {
    if (!data || !data.summary || typeof data.summary !== 'object') return [];
    return Object.entries(data.summary).filter(([, v]) => v !== null && v !== undefined && v !== '');
  }, [data]);

  const trendRows = useMemo(() => {
    const t = data?.trends;
    if (Array.isArray(t)) return t;
    if (t?.by_month && Array.isArray(t.by_month)) return t.by_month;
    if (t?.monthly && Array.isArray(t.monthly)) return t.monthly;
    return [];
  }, [data]);

  const chartData = useMemo(() => {
    if (!trendRows.length) return null;
    const labels = trendRows.map((r) => {
      const raw = r.month || r.period || r.date || '';
      return String(raw).slice(0, 7);
    });
    const migraine = trendRows.map((r) =>
      pickNumber(r, [
        'migraine_days_avg',
        'avg_migraine_days',
        'migraine_days',
      ])
    );
    const headache = trendRows.map((r) =>
      pickNumber(r, [
        'headache_days_avg',
        'avg_headache_days',
        'headache_days',
      ])
    );
    return { labels, migraine, headache };
  }, [trendRows]);

  const distributions = useMemo(() => {
    if (!data || !data.distributions || typeof data.distributions !== 'object') return [];
    return Object.entries(data.distributions);
  }, [data]);

  const alerts = useMemo(() => {
    const a = data?.alerts;
    if (Array.isArray(a)) return [['alertas', a]];
    if (!a || typeof a !== 'object') return [];
    return Object.entries(a);
  }, [data]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{'Dashboard global'}</Text>
        <Text style={styles.heroSubtitle}>
          {'Resumen clínico y tendencias del servicio'}
        </Text>
      </View>

            <View style={styles.card}>
        <Text style={styles.cardTitle}>{'Filtros'}</Text>
        <ChipGroup
          title={'Rango de fechas'}
          options={RANGE_OPTIONS}
          value={rangeKey}
          onChange={setRangeKey}
        />
        <ChipGroup
          title={'Sexo'}
          options={SEX_OPTIONS}
          value={sex}
          onChange={setSex}
        />
        <ChipGroup
          title={'Rango de edad'}
          options={AGE_OPTIONS}
          value={ageRange}
          onChange={setAgeRange}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadData}>
            <Text style={styles.primaryBtnText}>Aplicar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => {
              setRangeKey('90');
              setSex('');
              setHasDisease('');
              setAgeRange('');
              setTimeout(loadData, 0);
            }}
          >
            <Text style={styles.ghostBtnText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{'Resumen'}</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" />
            <Text style={styles.mutedText}>{'Cargando resumen...'}
            </Text>
          </View>
        ) : summaryItems.length === 0 ? (
          <Text style={styles.mutedText}>{'Sin datos para los filtros actuales.'}</Text>
        ) : (
          <View style={styles.summaryGrid}>
            {summaryItems.map(([key, value]) => (
              <View key={key} style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{String(value)}</Text>
                <Text style={styles.summaryLabel}>{labelize(key)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{'Tendencias mensuales'}</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" />
          </View>
        ) : !chartData ? (
          <Text style={styles.mutedText}>{'No hay datos de tendencias.'}</Text>
        ) : (
          <View>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [
                { data: chartData.migraine, color: () => theme.colors.primary, strokeWidth: 2 },
                { data: chartData.headache, color: () => theme.colors.accent, strokeWidth: 2 },
              ],
              legend: ['Migraña', 'Cefalea'],
            }}
            width={chartWidth}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 0,
              color: () => theme.colors.primary,
              labelColor: () => theme.colors.muted,
              propsForDots: {
                r: '3',
                strokeWidth: '2',
                stroke: theme.colors.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
          <Text style={styles.chartNote}>{'Promedio mensual de días con migraña y cefalea.'}</Text>
          {chartData.labels.length < 2 ? (
            <Text style={styles.chartNote}>{'Solo hay un mes con datos, por eso ves un solo punto.'}</Text>
          ) : null}
          </View>
        )}
      </View>

                  <View style={styles.card}>
        <Text style={styles.cardTitle}>{'Distribuciones'}</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" />
          </View>
        ) : distributions.length === 0 ? (
          <Text style={styles.mutedText}>{'Sin datos de distribuciï¿½n.'}</Text>
        ) : (
          distributions.map(([key, value]) => {
            const itemsBase = normalizeItems(value);
            const items = key === 'sex_distribution'
              ? ensureSexItems(itemsBase)
              : key === 'acute_medication_types'
                ? itemsBase.map((item) => ({ ...item, label: formatAcuteMedType(item.label) }))
                : itemsBase;
            const max = items.reduce((acc, item) => {
              const num = Number(item.count) || 0;
              return Math.max(acc, num);
            }, 0);
            return (
              <View key={key} style={styles.distBlock}>
                <Text style={styles.distTitle}>{labelize(key)}</Text>
                {items.length ? (
                  <View style={styles.table}>
                    {items.map((item, idx) => {
                      const percent = max ? Math.round((Number(item.count) / max) * 100) : 0;
                      return (
                        <View key={`${key}-${idx}`} style={styles.tableRow}>
                          <Text style={styles.tableLabel}>{String(item.label)}</Text>
                          <View style={styles.tableBarWrap}>
                            <View style={[styles.tableBar, { width: `${percent}%` }]} />
                          </View>
                          <Text style={styles.tableValue}>{String(item.count ?? '')}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  toLines(value).map((line, idx) => (
                    <Text key={`${key}-${idx}`} style={styles.distLine}>{line}</Text>
                  ))
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{'Alertas'}</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" />
          </View>
        ) : alerts.length === 0 ? (
          <Text style={styles.mutedText}>{'Sin alertas para los filtros actuales.'}</Text>
        ) : (
          alerts.map(([key, value]) => {
            const list = flattenAlertValue(value);
            const rows = list.map(formatAlertItem).filter(Boolean);
            return (
              <View key={key} style={styles.distBlock}>
                {key === 'alertas' ? null : (
                  <Text style={styles.distTitle}>{labelize(key)}</Text>
                )}
                {rows.length ? (
                  <View style={styles.table}>
                    {rows.map((row, idx) => (
                      <View key={`${key}-${idx}`} style={styles.alertRow}>
                        <View style={styles.alertHeader}>
                          <Text style={styles.alertTitle}>{row.patientName || 'Paciente'}</Text>
                          <Text style={styles.alertMeta}>{`Evaluación #${row.evaluationId || '-'}`}</Text>
                        </View>
                        <Text style={styles.alertMeta}>{row.evaluationDate || ''}</Text>
                        <View style={styles.alertNumbers}>
                          <View style={styles.alertChip}>
                            <Text style={styles.alertChipLabel}>{'Migraña'}</Text>
                            <Text style={styles.alertChipValue}>{row.headacheDurationMonths ? `${row.migraineDays || '-'} | ${row.headacheDurationMonths} m` : String(row.migraineDays || '-') }</Text>
                          </View>
                          <View style={styles.alertChip}>
                            <Text style={styles.alertChipLabel}>{row.acuteMedType ? `Med. aguda (${formatAcuteMedType(row.acuteMedType)})` : 'Med. aguda'}</Text>
                            <Text style={styles.alertChipValue}>{String(row.acuteMedDays || '-')}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.mutedText}>{'Sin detalles de alertas.'}</Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.bg,
  },
  hero: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
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
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  cardTitle: { fontWeight: '800', marginBottom: 8, fontSize: 15, color: theme.colors.text },
  filterGroup: { marginBottom: theme.spacing.sm },
  filterTitle: { fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primarySoft,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { fontSize: 12, color: theme.colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  ghostBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  ghostBtnText: { color: theme.colors.text, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs },
  mutedText: { color: theme.colors.muted, fontSize: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  summaryCard: {
    width: '48%',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primarySoft,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  summaryLabel: { marginTop: 2, color: theme.colors.muted, fontSize: 12 },
  chart: { marginTop: 8, borderRadius: theme.radius.md },
  chartNote: { marginTop: 6, color: theme.colors.muted, fontSize: 12 },
  distBlock: { marginBottom: theme.spacing.sm },
  distTitle: { fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  distLine: { color: theme.colors.muted, fontSize: 12 },
  table: { gap: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableLabel: { flex: 1.2, color: theme.colors.text, fontSize: 12 },
  tableBarWrap: { flex: 1, height: 6, backgroundColor: theme.colors.primarySoft, borderRadius: 999, overflow: 'hidden' },
  tableBar: { height: 6, backgroundColor: theme.colors.primary },
  tableValue: { width: 48, textAlign: 'right', color: theme.colors.muted, fontSize: 12 },
  alertRow: { padding: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft, gap: 6 },
  alertTitle: { fontWeight: '700', color: theme.colors.text },
  alertMeta: { color: theme.colors.muted, fontSize: 12 },
  alertNumbers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, flexShrink: 1, maxWidth: '100%' },
  alertChipLabel: { fontSize: 11, color: theme.colors.muted, flexShrink: 1 },
  alertChipValue: { fontWeight: '700', color: theme.colors.text },
});






































































