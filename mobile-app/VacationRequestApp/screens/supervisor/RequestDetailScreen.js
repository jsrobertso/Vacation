// mobile-app/VacationRequestApp/screens/supervisor/RequestDetailScreen.js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { approveVacationRequest, rejectVacationRequest } from '../../../services/api'; // Adjust path

const RequestDetailScreen = ({ route, navigation }) => {
  const { request } = route.params; // Request object passed from PendingRequestsScreen
  const [supervisorComments, setSupervisorComments] = useState(request.supervisor_comments || '');
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleApprove = async () => {
    setIsLoading(true);
    console.log('Approving request:', request._id, 'with comments:', supervisorComments);
    const result = await approveVacationRequest(request._id, supervisorComments);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Request Approved', `Request ID: ${request._id} has been approved.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Approval Failed', result.error || 'An unknown error occurred.');
    }
  };

  const handleReject = async () => {
    if (!supervisorComments.trim()) {
      Alert.alert('Comment Required', 'Please provide a comment when rejecting a request.');
      return;
    }
    setIsLoading(true);
    console.log('Rejecting request:', request._id, 'with comments:', supervisorComments);
    const result = await rejectVacationRequest(request._id, supervisorComments);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Request Rejected', `Request ID: ${request._id} has been rejected.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Rejection Failed', result.error || 'An unknown error occurred.');
    }
  };

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Request details not found.</Text>
      </View>
    );
  }

  const employee = request.user_id; // User object populated from backend

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Request Details</Text>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Employee:</Text>
        <Text style={styles.value}>{employee?.first_name || 'N/A'} {employee?.last_name || 'N/A'}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Employee ID:</Text>
        <Text style={styles.value}>{employee?.employee_id_internal || 'N/A'}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{employee?.email || 'N/A'}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>{employee?.location_id?.name || 'N/A'}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Start Date:</Text>
        <Text style={styles.value}>{formatDate(request.start_date)}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>End Date:</Text>
        <Text style={styles.value}>{formatDate(request.end_date)}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Reason:</Text>
        <Text style={styles.value}>{request.reason || 'N/A'}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, styles[`status${request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}`]]}>
            {request.status?.toUpperCase() || 'UNKNOWN'}
        </Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.label}>Requested Date:</Text>
        <Text style={styles.value}>{formatDate(request.requested_date)}</Text>
      </View>

      {request.status !== 'pending' && request.actioned_date && (
        <View style={styles.detailBlock}>
            <Text style={styles.label}>Actioned Date:</Text>
            <Text style={styles.value}>{formatDate(request.actioned_date)}</Text>
        </View>
      )}
       {request.status !== 'pending' && request.supervisor_comments && (
        <View style={styles.detailBlock}>
            <Text style={styles.label}>Previous Comments:</Text>
            <Text style={styles.value}>{request.supervisor_comments}</Text>
        </View>
      )}


      {request.status === 'pending' && (
        <>
          <Text style={styles.inputLabel}>Supervisor Comments:</Text>
          <TextInput
            style={styles.input}
            placeholder="Comments (required if rejecting)"
            value={supervisorComments}
            onChangeText={setSupervisorComments}
            multiline
            numberOfLines={4}
          />
          {isLoading ? (
            <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }}/>
          ) : (
            <View style={styles.buttonRow}>
              <Button title="Approve Request" onPress={handleApprove} color="#28a745" />
              <Button title="Reject Request" onPress={handleReject} color="#dc3545" />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#343a40', textAlign: 'center' },
  detailBlock: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  label: { fontSize: 16, fontWeight: '600', color: '#495057' },
  value: { fontSize: 16, color: '#212529', marginTop: 2 },
  statusPending: { color: '#ffc107', fontWeight: 'bold' },
  statusApproved: { color: '#28a745', fontWeight: 'bold' },
  statusRejected: { color: '#dc3545', fontWeight: 'bold' },
  statusCancelled: { color: '#6c757d', fontWeight: 'bold' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#495057', marginTop: 15, marginBottom: 5 },
  input: {
    minHeight: 80,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Use space-between for more separation
    marginTop: 10,
    marginBottom: 30, // Add some margin at the bottom
  },
  errorText: { fontSize: 18, color: 'red', textAlign: 'center', marginTop: 50 },
});

export default RequestDetailScreen;
