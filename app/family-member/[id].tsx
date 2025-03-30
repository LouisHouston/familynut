import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';

// Define types
interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  physicalStats: {
    height: { value: number; lastUpdated: string };
    weight: { value: number; lastUpdated: string };
    age: number;
  };
  nutritionalProfile: {
    dailyCalorieGoal: number;
    currentDailyCalories: number;
  };
}

interface CalorieEntry {
  id: string;
  memberId: string;
  foodName: string;
  calories: number;
  timestamp: string;
  date: string;
}

export default function FamilyMemberDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!id) return;
    
    const fetchMemberDetails = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const docRef = doc(db, 'familyMembers', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const memberData = { id: docSnap.id, ...docSnap.data() } as FamilyMember;
          setMember(memberData);
          
          // Fetch calorie entries for this member
          fetchCalorieEntries(id as string);
        } else {
          Alert.alert('Error', 'Family member not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching member details:', error);
        Alert.alert('Error', 'Failed to load member details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMemberDetails();
  }, [id, refreshTrigger]);

  const fetchCalorieEntries = async (memberId: string) => {
    try {
      const db = getFirestore();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const q = query(
        collection(db, 'calorieEntries'),
        where('memberId', '==', memberId),
        where('date', '==', todayStr),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const entries: CalorieEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as CalorieEntry);
      });
      
      setCalorieEntries(entries);
      
      // Sum up today's calories and update the member's currentDailyCalories
      const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
      
      // Update the member state locally
      if (member) {
        setMember(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nutritionalProfile: {
              ...prev.nutritionalProfile,
              currentDailyCalories: totalCalories
            }
          };
        });
        
        // Update Firestore
        const memberRef = doc(db, 'familyMembers', memberId);
        await updateDoc(memberRef, {
          'nutritionalProfile.currentDailyCalories': totalCalories
        });
      }
    } catch (error) {
      console.error('Error fetching calorie entries:', error);
    }
  };

  const addCalorieEntry = async () => {
    if (!member || !foodName || !calories) {
      Alert.alert('Error', 'Please enter both food name and calories');
      return;
    }
    
    if (isNaN(Number(calories)) || Number(calories) <= 0) {
      Alert.alert('Error', 'Please enter a valid calorie amount');
      return;
    }
    
    try {
      const db = getFirestore();
      const auth = getAuth();
      
      if (!auth.currentUser) {
        Alert.alert('Error', 'You must be logged in to add calories');
        return;
      }
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Create new calorie entry
      const entryData = {
        memberId: member.id,
        userId: auth.currentUser.uid,
        foodName: foodName,
        calories: Number(calories),
        timestamp: now.toISOString(),
        date: today
      };
      
      await addDoc(collection(db, 'calorieEntries'), entryData);
      
      // Reset input fields
      setFoodName('');
      setCalories('');
      
      // Refresh the entries list and member data
      setRefreshTrigger(prev => prev + 1);
      
      Alert.alert('Success', 'Calorie entry added successfully');
    } catch (error) {
      console.error('Error adding calorie entry:', error);
      Alert.alert('Error', 'Failed to add calorie entry');
    }
  };

  const deleteCalorieEntry = async (entryId: string) => {
    try {
      const db = getFirestore();
      const entryRef = doc(db, 'calorieEntries', entryId);
      await updateDoc(entryRef, { deleted: true });
      
      // Refresh the entries
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting entry:', error);
      Alert.alert('Error', 'Failed to delete entry');
    }
  };

  const renderCalorieProgress = () => {
    if (!member) return null;
    
    const { currentDailyCalories, dailyCalorieGoal } = member.nutritionalProfile;
    const percentage = Math.min((currentDailyCalories / dailyCalorieGoal) * 100, 100);
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${percentage}%`, backgroundColor: percentage > 100 ? '#FF5252' : '#4CAF50' }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentDailyCalories} / {dailyCalorieGoal} calories
          {percentage > 100 ? ' (Goal Exceeded)' : ''}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.container}>
        <Text>Member not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
        <Text style={styles.memberDetails}>
          Age: {member.physicalStats.age} • {member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}
        </Text>
        <Text style={styles.memberDetails}>
          {member.physicalStats.height.value}cm • {member.physicalStats.weight.value}kg
        </Text>
      </View>
      
      <View style={styles.calorieSection}>
        <Text style={styles.sectionTitle}>Today's Calories</Text>
        {renderCalorieProgress()}
        
        <View style={styles.addCalorieContainer}>
          <Text style={styles.addCalorieTitle}>Add Food</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.foodNameInput]}
              placeholder="Food name"
              value={foodName}
              onChangeText={setFoodName}
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={[styles.input, styles.calorieInput]}
              placeholder="Calories"
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              placeholderTextColor="#888"
            />
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addCalorieEntry}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.entriesContainer}>
          <Text style={styles.entriesTitle}>Today's Entries</Text>
          
          {calorieEntries.length === 0 ? (
            <Text style={styles.noEntriesText}>No entries yet today</Text>
          ) : (
            calorieEntries.map(entry => (
              <View key={entry.id} style={styles.entryItem}>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryName}>{entry.foodName}</Text>
                  <Text style={styles.entryCalories}>{entry.calories} cal</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => {
                    Alert.alert(
                      'Delete Entry',
                      'Are you sure you want to delete this entry?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', onPress: () => deleteCalorieEntry(entry.id) }
                      ]
                    );
                  }}
                >
                  <Text style={styles.deleteButtonText}>X</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  memberDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  calorieSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    marginBottom: 5,
  },
  progressFill: {
    height: 20,
    borderRadius: 10,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  addCalorieContainer: {
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  addCalorieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  foodNameInput: {
    flex: 2,
    marginRight: 10,
  },
  calorieInput: {
    flex: 1,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  entriesContainer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  entriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noEntriesText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  entryCalories: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});