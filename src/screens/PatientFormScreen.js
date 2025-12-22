// src/screens/PatientFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  StyleSheet,
  Button,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createPatient, updatePatient } from '../api';

export default function PatientFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const patient = route.params?.patient || null;
  const isEdit = !!patient;

  const [documentNumber, setDocumentNumber] = useState(
    patient?.document_number || ''
  );
  const [firstName, setFirstName] = useState(patient?.first_name || '');
  const [lastName, setLastName] = useState(patient?.last_name || '');

  const [birthDate, setBirthDate] = useState(
    patient?.birth_date || ''
  ); // AAAA-MM-DD
  const [birthDateObj, setBirthDateObj] = useState(
    patient?.birth_date
      ? new Date(`${patient.birth_date}T00:00:00`)
      : new Date()
  );
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);

  const [sex, setSex] = useState(patient?.sex || 'O');
  const [weight, setWeight] = useState(
    patient?.weight_kg ? String(patient.weight_kg) : ''
  );
  const [height, setHeight] = useState(
    patient?.height_cm ? String(patient.height_cm) : ''
  );
  const [email, setEmail] = useState(patient?.email || '');
  const [phone, setPhone] = useState(patient?.phone || '');
  const [notes, setNotes] = useState(patient?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Editar paciente' : 'Nuevo paciente',
    });
  }, [isEdit]);

  const onChangeBirthDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowBirthDatePicker(false);
    }
    if (selectedDate) {
      setBirthDateObj(selectedDate);
      const year = selectedDate.getFullYear();
      const month = `${selectedDate.getMonth() + 1}`.padStart(2, '0');
      const day = `${selectedDate.getDate()}`.padStart(2, '0');
      setBirthDate(`${year}-${month}-${day}`); // AAAA-MM-DD en hora local
    }
  };

  const handleSubmit = async () => {
    if (saving) return;

    const errors = [];

    // Nombres obligatorios
    if (!firstName.trim()) errors.push('El nombre es obligatorio.');
    if (!lastName.trim()) errors.push('Los apellidos son obligatorios.');

    // DNI: exactamente 8 dígitos
    if (documentNumber.trim() !== '') {
      const doc = documentNumber.trim();
      const dniRegex = /^[0-9]{8}$/;
      if (!dniRegex.test(doc)) {
        errors.push('El N° de documento debe tener exactamente 8 dígitos.');
      }
    }

    // Fecha de nacimiento: válida, no futura, no >120 años
    if (birthDate) {
      const d = new Date(birthDate + 'T00:00:00');
      if (Number.isNaN(d.getTime())) {
        errors.push('La fecha de nacimiento no es válida.');
      } else {
        const today = new Date();
        const todayMid = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const oldest = new Date(
          todayMid.getFullYear() - 120,
          todayMid.getMonth(),
          todayMid.getDate()
        );
        if (d > todayMid) {
          errors.push('La fecha de nacimiento no puede ser futura.');
        }
        if (d < oldest) {
          errors.push(
            'La fecha de nacimiento es demasiado antigua (más de 120 años).'
          );
        }
      }
    }

    // Peso (kg): 1–400
    let weightNum = null;
    if (weight.trim() !== '') {
      weightNum = Number(weight);
      if (Number.isNaN(weightNum)) {
        errors.push('El peso debe ser un número.');
      } else if (weightNum <= 0 || weightNum > 400) {
        errors.push('El peso debe estar entre 1 y 400 kg.');
      }
    }

    // Talla (cm): 30–250
    let heightNum = null;
    if (height.trim() !== '') {
      heightNum = Number(height);
      if (Number.isNaN(heightNum)) {
        errors.push('La talla debe ser un número.');
      } else if (heightNum < 30 || heightNum > 250) {
        errors.push('La talla debe estar entre 30 y 250 cm.');
      }
    }

    // Email (formato básico)
    if (email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('El correo electrónico no tiene un formato válido.');
      }
    }

    // Teléfono: exactamente 9 dígitos
    if (phone.trim() !== '') {
      const digits = phone.replace(/\D/g, '');
      if (!/^[0-9]{9}$/.test(digits)) {
        errors.push('El teléfono debe tener exactamente 9 dígitos.');
      }
    }

    if (errors.length > 0) {
      Alert.alert('Validación', errors.join('\n'));
      return;
    }

    const payload = {
      document_number: documentNumber.trim() || null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_date: birthDate || null,
      sex: sex || null,
      weight_kg: weightNum,
      height_cm: heightNum,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await updatePatient(patient.id, payload);
        Alert.alert('Éxito', 'Paciente actualizado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createPatient(payload);
        Alert.alert('Éxito', 'Paciente creado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving patient', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el paciente.');
    } finally {
      setSaving(false);
    }
  };

function SexButton({ value, label }) {
  return (
    <TouchableOpacity
      style={[
        styles.sexButton,
        sex === value && styles.sexButtonActive,
      ]}
      onPress={() => setSex(value)}
    >
      <Text
        style={[
          styles.sexButtonText,
          sex === value && styles.sexButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Datos personales</Text>

      <Text style={styles.label}>N° Documento (DNI – 8 dígitos)</Text>
      <TextInput
        style={styles.input}
        value={documentNumber}
        onChangeText={setDocumentNumber}
        placeholder="12345678"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Nombres *</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Nombres"
      />

      <Text style={styles.label}>Apellidos *</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Apellidos"
      />

      <Text style={styles.label}>Fecha de nacimiento</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowBirthDatePicker(true)}
      >
        <Text
          style={
            birthDate ? styles.dateText : styles.datePlaceholder
          }
        >
          {birthDate || 'Selecciona fecha'}
        </Text>
      </TouchableOpacity>
      {showBirthDatePicker && (
        <DateTimePicker
          value={birthDateObj}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onChangeBirthDate}
        />
      )}

      <Text style={styles.label}>Sexo</Text>
      <View style={styles.sexRow}>
        <SexButton value="F" label="Femenino" />
        <SexButton value="M" label="Masculino" />
        <SexButton value="O" label="Otro" />
      </View>

      <Text style={styles.label}>Peso (kg)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
        placeholder="Ej: 65"
      />

      <Text style={styles.label}>Talla (cm)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
        placeholder="Ej: 165"
      />

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder="ejemplo@correo.com"
      />

      <Text style={styles.label}>Teléfono (9 dígitos)</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        placeholder="999123456"
      />

      <Text style={styles.label}>Notas</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
        placeholder="Comorbilidades, observaciones clínicas, etc."
      />

      <View style={styles.bottomSpacer}>
        <Button
          title={saving ? 'Guardando...' : 'Guardar paciente'}
          onPress={handleSubmit}
          disabled={saving}
        />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    fontWeight: '500',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  dateText: {
    color: '#111',
  },
  datePlaceholder: {
    color: '#999',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  sexRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  sexButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sexButtonText: {
    color: '#333',
    fontSize: 13,
  },
  sexButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomSpacer: { marginTop: 12, marginBottom: 40 },
});
