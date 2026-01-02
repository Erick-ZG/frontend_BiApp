// src/api.js
import axios from 'axios';

// Para emulador Android + php artisan serve en tu PC
// 10.0.2.2 -> apunta a localhost de tu máquina desde el emulador
const API_BASE_URL = "https://biapp-production.up.railway.app/api";

//https://biapp-production.up.railway.app/api
//http://10.0.2.2:8000/api
//http://192.168.68.52:8000/api

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ================== PACIENTES ==================
export async function fetchPatients(page = 1) {
  const res = await api.get('/patients', { params: { page } });
  // PatientController devuelve paginator, ajusta si cambiaste
  return res.data;
}

export async function createPatient(data) {
  const res = await api.post('/patients', data);
  return res.data;
}

export async function updatePatient(id, data) {
  const res = await api.put(`/patients/${id}`, data);
  return res.data;
}

export async function deletePatient(id) {
  await api.delete(`/patients/${id}`);
}

// ================== EVALUACIONES ==================
export async function fetchPatientEvaluations(patientId) {
  const res = await api.get(`/patients/${patientId}/evaluations`);
  return res.data;
}

export async function createEvaluation(payload) {
  const res = await api.post('/evaluations', payload);
  return res.data;
}

export async function updateEvaluation(id, payload) {
  const res = await api.put(`/evaluations/${id}`, payload);
  return res.data;
}

export async function deleteEvaluation(id) {
  await api.delete(`/evaluations/${id}`);
}

// ================== KPIs ==================
export async function fetchKpisForMigraine() {
  const res = await api.get('/kpis', { params: { disease_id: 1 } });
  return res.data;
}


export async function fetchHistorySuggestion(patientId, evaluationDate) {
  const res = await api.get(`/patients/${patientId}/evaluations/history-suggestion`, {
    params: evaluationDate ? { evaluation_date: evaluationDate } : {},
  });
  return res.data;
}

// ================== IA (diagnósticos) ==================

// Obtener diagnósticos de IA por evaluación (función base)
export async function fetchAiDiagnoses(evaluationId) {
  const res = await api.get(`/evaluations/${evaluationId}/ai-diagnoses`);
  return res.data;
}

// Alias por si en algún lado usas el nombre viejo
export async function fetchAiDiagnosesByEvaluation(evaluationId) {
  return fetchAiDiagnoses(evaluationId);
}

// Crear o actualizar diagnóstico de IA (modo manual, si lo usas)
export async function saveAiDiagnosis(evaluationId, payload, id = null) {
  if (id) {
    const res = await api.put(`/ai-diagnoses/${id}`, payload);
    return res.data;
  } else {
    const res = await api.post(
      `/evaluations/${evaluationId}/ai-diagnoses`,
      payload
    );
    return res.data;
  }
}

// Marcar un diagnóstico de IA como el mejor según el médico
export async function selectAiDiagnosis(aiDiagnosisId) {
  const res = await api.post(`/ai-diagnoses/${aiDiagnosisId}/select`);
  return res.data;
}

// Ejecutar Azure OpenAI + Perplexity para una evaluación y guardar resultados
export async function runAiForEvaluation(evaluationId) {
  const res = await api.post(
    `/evaluations/${evaluationId}/run-ai`,
    null,
    { timeout: 120000 } // 120s
  );
  return res.data;
}

// Tendencias de KPIs por paciente
export async function fetchKpiTrends(patientId) {
  const res = await api.get(`/patients/${patientId}/kpi-trends`);
  return res.data;
}

// Dashboard global
export async function fetchDashboard(params = {}) {
  const res = await api.get('/dashboard', { params });
  return res.data;
}

export default api;

