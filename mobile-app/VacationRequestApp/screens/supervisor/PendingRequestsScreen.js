// mobile-app/VacationRequestApp/screens/supervisor/PendingRequestsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSupervisorRequests } from '../../../services/api'; // Adjust path as necessary

const PendingRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingRequests = async () => {
    if (!refreshing) setLoading(true);
    const result = await getSupervisorRequests();
    if (result.success) {
      // Filter for pending requests on the client-side as an extra check,
      // though the backend should ideally only send pending ones.
      // Sort by requested_date ascending (oldest first to prioritize)
      const pending = result.data.filter(req => req.status === 'pending')
                                .sort((a,b) => new Date(a.requested_date) - new Date(b.requested_date));
      setRequests(pending);
    } else {
      Alert.alert('Error', result.error || 'Failed to fetch pending requests.');
      setRequests([]);
    }
    if (!refreshing) setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
      return () => {};
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingRequests();
  }, []);

  const handleViewDetails = (request) => {
    // Pass the full request object. Ensure it's serializable if it contains complex objects.
    // The request object from Mongoose should be fine.
    navigation.navigate('RequestDetailScreen', { request });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleViewDetails(item)} style={styles.requestItem}>
      <Text style={styles.employeeName}>
        {item.user_id?.first_name || 'N/A'} {item.user_id?.last_name || 'N/A'}
      </Text>
      <Text style={styles.detailText}>Employee ID: {item.user_id?.employee_id_internal || 'N/A'}</Text>
      <Text style={styles.detailText}>Dates: {formatDate(item.start_date)} to {formatDate(item.end_date)}</Text>
      <Text style={styles.detailText}>Reason: {item.reason || 'N/A'}</Text>
      <Text style={styles.requestedDateText}>Requested: {formatDate(item.requested_date)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;
  }

  if (requests.length === 0) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.noRequestsText}>No pending vacation requests.</Text>
        <Button title="Refresh" onPress={fetchPendingRequests} color="#007bff"/>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={item => item._id || item.id}
      renderItem={renderItem}
      style={styles.container}
      contentContainerStyle={requests.length === 0 ? styles.centeredMessageContainer : {}}
      ListEmptyComponent={
          !loading && <View style={styles.centeredMessageContainer}><Text style={styles.noRequestsText}>No pending vacation requests.</Text></View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007bff"]}/>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noRequestsText: { fontSize: 18, color: '#555', marginBottom: 10 },
  requestItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  employeeName: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  detailText: { fontSize: 15, color: '#555', marginBottom: 3 },
  requestedDateText: { fontSize: 13, color: '#777', marginTop: 5, fontStyle: 'italic' },
});

export default PendingRequestsScreen;
