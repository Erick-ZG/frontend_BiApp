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
import { theme } from '../theme';

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
  ); // YYYY-MM-DD
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
      setBirthDate(`${year}-${month}-${day}`);
    }
  };

  const handleSubmit = async () => {
    if (saving) return;

    const errors = [];

    if (!firstName.trim()) errors.push('El nombre es obligatorio.');
    if (!lastName.trim()) errors.push('Los apellidos son obligatorios.');

    if (documentNumber.trim() !== '') {
      const doc = documentNumber.trim();
      const dniRegex = /^[0-9]{8}$/;
      if (!dniRegex.test(doc)) {
        errors.push('El nro de documento debe tener exactamente 8 digitos.');
      }
    }

    if (birthDate) {
      const d = new Date(birthDate + 'T00:00:00');
      if (Number.isNaN(d.getTime())) {
        errors.push('La fecha de nacimiento no es valida.');
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
          errors.push('La fecha de nacimiento es demasiado antigua (mas de 120 anos).');
        }
      }
    }

    let weightNum = null;
    if (weight.trim() !== '') {
      weightNum = Number(weight);
      if (Number.isNaN(weightNum)) {
        errors.push('El peso debe ser un numero.');
      } else if (weightNum <= 0 || weightNum > 400) {
        errors.push('El peso debe estar entre 1 y 400 kg.');
      }
    }

    let heightNum = null;
    if (height.trim() !== '') {
      heightNum = Number(height);
      if (Number.isNaN(heightNum)) {
        errors.push('La talla debe ser un numero.');
      } else if (heightNum < 30 || heightNum > 250) {
        errors.push('La talla debe estar entre 30 y 250 cm.');
      }
    }

    if (email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('El correo electronico no tiene un formato valido.');
      }
    }

    if (phone.trim() !== '') {
      const digits = phone.replace(/\D/g, '');
      if (!/^[0-9]{9}$/.test(digits)) {
        errors.push('El telefono debe tener exactamente 9 digitos.');
      }
    }

    if (errors.length > 0) {
      Alert.alert('Validacion', errors.join('\n'));
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
        Alert.alert('Exito', 'Paciente actualizado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createPatient(payload);
        Alert.alert('Exito', 'Paciente creado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving patient', error);
      Alert.alert('Error', 'Ocurrio un error al guardar el paciente.');
    } finally {
      setSaving(false);
    }
  };

  function SexButton({ value, label }) {
    return (
      <TouchableOpacity
        style={[styles.sexButton, sex === value && styles.sexButtonActive]}
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

        <Text style={styles.label}>Nro Documento (DNI - 8 digitos)</Text>
        <TextInput
          style={styles.input}
          value={documentNumber}
          onChangeText={setDocumentNumber}
          placeholder="12345678"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Nombres *</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Nombres"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Apellidos *</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Apellidos"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Fecha de nacimiento</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowBirthDatePicker(true)}>
          <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
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
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Talla (cm)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
          placeholder="Ej: 165"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Correo electronico</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          placeholder="ejemplo@correo.com"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Telefono (9 digitos)</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="999123456"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Comorbilidades, observaciones clinicas, etc."
          placeholderTextColor="#9ca3af"
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
    padding: theme.spacing.md,
    paddingBottom: 120,
    backgroundColor: theme.colors.bg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  label: {
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
  },
  dateText: {
    color: theme.colors.text,
  },
  datePlaceholder: {
    color: theme.colors.muted,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  sexRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  sexButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sexButtonText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  sexButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  bottomSpacer: { marginTop: theme.spacing.md, marginBottom: 40 },
});
