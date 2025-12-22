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
    // cada vez que la pantalla se enfoca, recargamos la lista
    if (isFocused) {
      loadPatients();
    }
  }, [isFocused]);

  // Botón "+" en el header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('PatientForm')}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>+ Paciente</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        navigation.navigate('PatientDetail', {
          patient: item,
        })
      }
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando pacientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {patients.length === 0 ? (
        <View style={styles.center}>
          <Text>No hay pacientes registrados aún.</Text>
          <Text>Pulsa "+ Paciente" para crear el primero.</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  item: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  name: { fontWeight: 'bold', fontSize: 16 },
  subText: { color: '#555', fontSize: 13 },
  headerButton: {
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
