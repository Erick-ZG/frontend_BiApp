// src/screens/KpiTrendScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { fetchKpiTrends, fetchPatientEvaluations } from '../api';

const screenWidth = Dimensions.get('window').width;

const KPI_OPTIONS = [
  {
    key: 'migraine_days_month',
    label: 'Días con migraña al mes',
    shortLabel: 'Migraña',
    unit: 'días',
  },
  {
    key: 'headache_days_month',
    label: 'Días de cefalea al mes',
    shortLabel: 'Cefalea',
    unit: 'días',
  },
  {
    key: 'acute_medication_days_month',
    label: 'Días de medicación aguda',
    shortLabel: 'Medicación',
    unit: 'días',
  },
  {
    key: 'pain_intensity_avg',                  
    label: 'Intensidad promedio del dolor (VAS 0–10)',
    shortLabel: 'Dolor',
    unit: 'VAS 0–10',
  },
  {
    key: 'disability_score',
    label: 'Puntaje de discapacidad (MIDAS)',
    shortLabel: 'MIDAS',
    unit: 'puntos',
  },
];

// Historia del patrón: prioriza lo ingresado por el usuario
const getHistoryMonths = (entry) => {
  // Primero, toma el valor numérico del KPI de historia si viene en kpi_values
  if (Array.isArray(entry.kpi_values)) {
    const kv = entry.kpi_values.find(
      (item) =>
        item?.code === 'HEADACHE_DURATION_MONTHS' ||
        item?.kpi?.code === 'HEADACHE_DURATION_MONTHS' ||
        item?.kpi_id === 8
    );
    if (kv) {
      const num = kv.value_numeric ?? (kv.value_string ? Number(kv.value_string) : null);
      if (num !== null && num !== undefined && !Number.isNaN(Number(num))) {
      return Number(num);
    }
  }
  }

  const candidates = [
    entry.history_months_input,
    entry.history_months_user,
    entry.history_months_raw,
    entry.history_months,
    entry.headache_duration_months,
    entry.duration_months,
    entry.headache_duration,
    entry.duration,
    entry.history_months_consolidated,
    entry.history_months_suggested,
    entry.history_suggested,
  ];

  for (const c of candidates) {
    if (c !== null && c !== undefined && !Number.isNaN(Number(c))) {
      return Number(c);
    }
  }

  // Intento desde kpi_values si vienen en la respuesta
  if (Array.isArray(entry.kpi_values)) {
    const kv = entry.kpi_values.find(
      (item) =>
        item?.code === 'HEADACHE_DURATION_MONTHS' ||
        item?.kpi?.code === 'HEADACHE_DURATION_MONTHS'
    );
    const kvVal =
      kv?.value_numeric ?? kv?.value_string ?? kv?.value_boolean ?? null;
    if (kvVal !== null && !Number.isNaN(Number(kvVal))) {
      return Number(kvVal);
    }
  }

  // Último recurso: usa lo consolidado para no dejar vacío
  const fallback =
    entry.history_months_consolidated ??
    entry.history_months_suggested ??
    entry.history_suggested ??
    null;
  if (fallback !== null && !Number.isNaN(Number(fallback))) {
    return Number(fallback);
  }

  return null;
};

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#2563eb',
  },
};

export default function KpiTrendScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { patient } = route.params;

  const [selectedKpi, setSelectedKpi] = useState(KPI_OPTIONS[0].key);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      title: `Evolución KPIs - ${patient.first_name}`,
    });
    loadTrends();
  }, []);

  async function loadTrends() {
    try {
      setLoading(true);
      setError(null);
      const [trendsRaw, evalsRaw] = await Promise.all([
        fetchKpiTrends(patient.id),
        fetchPatientEvaluations(patient.id).catch(() => []),
      ]);

      const trends = Array.isArray(trendsRaw) ? trendsRaw : [];
      const evals = Array.isArray(evalsRaw) ? evalsRaw : [];

      const historyMap = {};
      evals.forEach((ev) => {
        if (Array.isArray(ev.kpi_values)) {
          const kv = ev.kpi_values.find(
            (item) =>
              item?.code === 'HEADACHE_DURATION_MONTHS' ||
              item?.kpi?.code === 'HEADACHE_DURATION_MONTHS' ||
              item?.kpi_id === 8
          );
          const num = kv?.value_numeric ?? (kv?.value_string ? Number(kv.value_string) : null);
          if (num !== null && num !== undefined && !Number.isNaN(Number(num))) {
            historyMap[ev.id] = Number(num);
          }
        }
      });

      const merged = trends.map((t) => ({
        ...t,
        history_months_user: historyMap[t.id] ?? t.history_months_user,
      }));

      setTrendData(merged);
    } catch (err) {
      console.error('Error loading KPI trends', err);
      setError('No se pudieron cargar las tendencias de KPIs.');
    } finally {
      setLoading(false);
    }
  }

  // Construye datos para el gráfico según el KPI seleccionado
  const chartData = useMemo(() => {
    const kpiMeta = KPI_OPTIONS.find((k) => k.key === selectedKpi);

    if (!trendData || trendData.length === 0) {
      return { labels: [], data: [], kpiMeta };
    }

    const points = trendData
      .filter(
        (e) =>
          e[selectedKpi] !== null &&
          e[selectedKpi] !== undefined &&
          e[selectedKpi] !== ''
      )
      .map((e) => {
        const rawDate = e.evaluation_date || '';
        const label =
          typeof rawDate === 'string'
            ? rawDate.slice(5, 10) // MM-DD
            : '';
        return {
          label,
          value: Number(e[selectedKpi]),
        };
      });

    return {
      labels: points.map((p) => p.label),
      data: points.map((p) => p.value),
      kpiMeta,
    };
  }, [trendData, selectedKpi]);

  const hasEnoughPoints = chartData.data.length >= 2;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Indicador a analizar</Text>
        <Text style={styles.helper}>
          Selecciona qué KPI quieres ver en el tiempo para este paciente.
        </Text>

        <View style={styles.kpiSelectorRow}>
          {KPI_OPTIONS.map((kpi) => {
            const active = selectedKpi === kpi.key;
            return (
              <TouchableOpacity
                key={kpi.key}
                style={[
                  styles.kpiButton,
                  active && styles.kpiButtonActive,
                ]}
                onPress={() => setSelectedKpi(kpi.key)}
              >
                <Text
                  style={[
                    styles.kpiButtonText,
                    active && styles.kpiButtonTextActive,
                  ]}
                >
                  {kpi.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Gráfico de evolución</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text>Cargando datos...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : chartData.data.length === 0 ? (
          <Text style={styles.helper}>
            No hay valores registrados para este indicador en las
            evaluaciones de este paciente.
          </Text>
        ) : (
          <>
            {hasEnoughPoints ? (
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      data: chartData.data,
                    },
                  ],
                }}
                width={screenWidth - 32} // padding horizontal 16 + 16
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            ) : (
              <Text style={styles.helper}>
                Solo hay un punto con datos para este indicador. Se
                necesitan al menos 2 evaluaciones para ver una tendencia.
              </Text>
            )}
            <Text style={styles.helper}>
              Eje X: fecha de evaluación (MM-DD).{' '}
              Eje Y: {chartData.kpiMeta?.label} ({chartData.kpiMeta?.unit}).
            </Text>
          </>
        )}
      </View>

      {/* Tabla simple con los valores por evaluación */}
      {!loading && trendData.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>
            Valores por evaluación ({' '}
            {
              KPI_OPTIONS.find((k) => k.key === selectedKpi)
                ?.label
            }{' '}
            )
          </Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>
              Fecha
            </Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>
              Valor
            </Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Duración (meses)</Text>
          </View>

          {trendData.map((e) => {
            const rawDate = e.evaluation_date || '';
            const dateLabel =
              typeof rawDate === 'string'
                ? rawDate.slice(0, 10)
                : String(rawDate);
            const val =
              e[selectedKpi] !== null && e[selectedKpi] !== undefined
                ? e[selectedKpi]
                : '-';
            const historyMonths = getHistoryMonths(e);
            return (
              <View
                key={e.id}
                style={styles.tableRow}
              >
                <Text style={styles.tableCell}>{dateLabel}</Text>
                <Text style={styles.tableCell}>{val}</Text>
                <Text style={styles.tableCell}>
                  {historyMonths !== null && historyMonths !== undefined
                    ? historyMonths
                    : '-'}
                </Text>
              </View>
            );
          })}
        </View>
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  blockTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 15,
  },
  helper: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  kpiSelectorRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#eef2ff',
  },
  kpiButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  kpiButtonText: {
    fontSize: 12,
    color: '#1f2937',
  },
  kpiButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});
