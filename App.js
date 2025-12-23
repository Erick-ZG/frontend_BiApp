// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PatientsListScreen from './src/screens/PatientsListScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import EvaluationFormScreen from './src/screens/EvaluationFormScreen';
import PatientFormScreen from './src/screens/PatientFormScreen';
import EvaluationDetailScreen from './src/screens/EvaluationDetailScreen';
import KpiTrendScreen from './src/screens/KpiTrendScreen';
import { theme } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="PatientsList"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen
          name="PatientsList"
          component={PatientsListScreen}
          options={{ title: 'Pacientes' }}
        />
        <Stack.Screen
          name="PatientDetail"
          component={PatientDetailScreen}
          options={{ title: 'Detalle del paciente' }}
        />
        <Stack.Screen
          name="NewEvaluation"
          component={EvaluationFormScreen}
          options={{ title: 'Nueva evaluacion' }}
        />
        <Stack.Screen
          name="PatientForm"
          component={PatientFormScreen}
          options={{ title: 'Paciente' }}
        />
        <Stack.Screen
          name="EvaluationDetail"
          component={EvaluationDetailScreen}
          options={{ title: 'Analisis con IA' }}
        />
        <Stack.Screen
          name="KpiTrend"
          component={KpiTrendScreen}
          options={{ title: 'Evolucion de KPIs' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
