// mobile-app/VacationRequestApp/screens/employee/MyRequestsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; // To refresh data when screen is focused
import { getEmployeeRequests } from '../../../services/api'; // Adjust path as necessary

const MyRequestsScreen = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

  const fetchRequests = async () => {
    if (!refreshing) setLoading(true); // Don't show main loader during pull-to-refresh
    const result = await getEmployeeRequests();
    if (result.success) {
      // Sort requests by requested_date descending (newest first)
      const sortedRequests = result.data.sort((a, b) => new Date(b.requested_date) - new Date(a.requested_date));
      setRequests(sortedRequests);
    } else {
      Alert.alert('Error', result.error || 'Failed to fetch requests.');
      setRequests([]); // Clear requests on error
    }
    if (!refreshing) setLoading(false);
    setRefreshing(false);
  };

  // useFocusEffect to fetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      return () => {
        // Optional: cleanup if needed when screen loses focus
      };
    }, []) // Empty dependency array means it runs on first focus and then subsequent focuses
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderItem = ({ item }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <Text style={styles.reasonText}>Reason: {item.reason || 'N/A'}</Text>
        <Text style={[styles.statusText, styles[`status${item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}`]]}>
          {item.status?.toUpperCase() || 'UNKNOWN'}
        </Text>
      </View>
      <Text style={styles.dateText}>From: {formatDate(item.start_date)} To: {formatDate(item.end_date)}</Text>
      <Text style={styles.dateText}>Requested: {formatDate(item.requested_date)}</Text>
      {item.actioned_date && (
        <Text style={styles.dateText}>Actioned: {formatDate(item.actioned_date)}</Text>
      )}
      {item.supervisor_comments && (
        <Text style={styles.commentsText}>Comments: {item.supervisor_comments}</Text>
      )}
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;
  }

  if (!requests || requests.length === 0) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.noRequestsText}>No vacation requests found.</Text>
        <Button title="Refresh" onPress={fetchRequests} color="#007bff"/>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={item => item._id || item.id} // Use _id for MongoDB
      renderItem={renderItem}
      style={styles.container}
      contentContainerStyle={requests.length === 0 ? styles.centeredMessageContainer : {}}
      ListEmptyComponent={ // Fallback if requests array becomes empty after initial load
          !loading && <View style={styles.centeredMessageContainer}><Text style={styles.noRequestsText}>No vacation requests found.</Text></View>
      }
      refreshControl={ // Pull-to-refresh
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reasonText: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1 },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden', // Ensures borderRadius is applied to background
    color: '#fff', // Default text color for status
  },
  statusPending: { backgroundColor: '#ffc107' /* Amber */, color: '#333' },
  statusApproved: { backgroundColor: '#28a745' /* Green */ },
  statusRejected: { backgroundColor: '#dc3545' /* Red */ },
  statusCancelled: { backgroundColor: '#6c757d' /* Gray */},
  dateText: { fontSize: 14, color: '#555', marginBottom: 3 },
  commentsText: { fontSize: 14, color: '#777', fontStyle: 'italic', marginTop: 5, paddingTop: 5, borderTopColor: '#eee', borderTopWidth:1 },
});

export default MyRequestsScreen;
