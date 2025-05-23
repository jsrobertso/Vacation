// mobile-app/VacationRequestApp/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { loginUser, getStoredUser } from '../../services/api'; // Adjust path as necessary

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    console.log('Login attempt with:', email, password);

    const result = await loginUser(email, password);
    setIsLoading(false);

    if (result.success && result.data && result.data.user) {
      const user = result.data.user; // User object from backend
      Alert.alert('Login Success', `Welcome ${user.first_name}! Role: ${user.role}`);

      // Navigate based on role
      if (user.role === 'supervisor' || user.role === 'admin') {
        navigation.replace('SupervisorWorkflow');
      } else {
        navigation.replace('EmployeeTabs');
      }
    } else {
      Alert.alert('Login Failed', result.error || 'An unknown error occurred.');
    }
  };

  // Optional: Add navigation to a SignupScreen
  const navigateToSignup = () => {
    navigation.navigate('Signup'); // Assuming you have a SignupScreen defined in your navigator
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title="Login" onPress={handleLogin} />
          <View style={{ marginTop: 10 }} />
          <Button title="Don't have an account? Sign Up" onPress={navigateToSignup} color="#007bff" />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#333' },
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
  // Add styles for buttons if needed, or use default
});

export default LoginScreen;
