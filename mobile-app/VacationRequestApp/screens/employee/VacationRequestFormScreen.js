// mobile-app/VacationRequestApp/screens/employee/VacationRequestFormScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { submitVacationRequest } from '../../../services/api'; // Adjust path as necessary
// For a real app, use @react-native-community/datetimepicker or a similar library
// For now, we'll use basic TextInput for dates and expect ISO format (YYYY-MM-DD)

const VacationRequestFormScreen = ({ navigation }) => {
  // Default to today for start date, and a week from today for end date for simplicity
  const today = new Date();
  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(today.getDate() + 7);

  // Helper to format date to YYYY-MM-DD
  const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(formatDateToISO(today));
  const [endDate, setEndDate] = useState(formatDateToISO(oneWeekLater));
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Basic date validation (YYYY-MM-DD)
  const isValidDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    const [year, month, day] = dateString.split('-').map(Number);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
        return false; // Invalid date like 2023-02-30
    }
    return !isNaN(date.getTime());
  };


  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your request.');
      return;
    }
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      Alert.alert('Error', 'Please enter valid dates in YYYY-MM-DD format.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      Alert.alert('Error', 'End date must be after start date.');
      return;
    }

    setIsLoading(true);
    console.log('Submitting vacation request:', { start_date: startDate, end_date: endDate, reason });

    const result = await submitVacationRequest({ start_date: startDate, end_date: endDate, reason });
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Vacation request submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() } // Or navigate to MyRequestsScreen
      ]);
      // Clear form
      setReason('');
      setStartDate(formatDateToISO(new Date())); // Reset dates
      setEndDate(formatDateToISO(new Date(new Date().setDate(new Date().getDate() + 7))));
    } else {
      Alert.alert('Submission Failed', result.error || 'An unknown error occurred.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Vacation Request</Text>
      <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={startDate}
        onChangeText={setStartDate}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} // Basic numeric for simplicity
      />
      <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={endDate}
        onChangeText={setEndDate}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      />
      <Text style={styles.label}>Reason</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Reason for request"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }}/>
      ) : (
        <Button title="Submit Request" onPress={handleSubmit} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#333' },
  label: { fontSize: 16, color: '#333', marginBottom: 5, marginLeft: 5 },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top', // For Android
    paddingTop: 15, // Padding for multiline text
  },
});

export default VacationRequestFormScreen;
