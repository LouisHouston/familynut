import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity, FlatList, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import ParallaxScrollView from '@/components/ParallaxScrollView';

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  physicalStats: {
    height: {
      value: number;
      lastUpdated: string;
    };
    weight: {
      value: number;
      lastUpdated: string;
    };
    age: number;
  };
  nutritionalProfile: {
    dailyCalorieGoal: number;
    currentDailyCalories: number;
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'other',
    height: '',
    weight: '',
    dailyCalorieGoal: '',
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchFamilyMembers(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchFamilyMembers = async (userId: string) => {
    try {
      const db = getFirestore();
      const q = query(
        collection(db, 'familyMembers'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const members: FamilyMember[] = [];
      
      querySnapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() } as FamilyMember);
      });
      
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const calculateCalorieGoal = (weight: number, height: number, age: number, gender: string) => {
    let bmr = 0;
    
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else if (gender === 'female') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    } else {
      const maleBmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      const femaleBmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      bmr = Math.round((maleBmr + femaleBmr) / 2);
    }
    
    //rounding
    return Math.round(bmr);
  };

  const addFamilyMember = async () => {
    try {
      if (!user) return;
      
      const db = getFirestore();
      const currentDate = new Date().toISOString();
      
      // Calculate age from date of birth
      const dob = new Date(newMember.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() - 
                 (today.getMonth() < dob.getMonth() || 
                 (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate()) ? 1 : 0);
      
      // Parse height and weight to numbers
      const height = parseFloat(newMember.height);
      const weight = parseFloat(newMember.weight);
      
      // Calculate daily calorie goal based on member's metrics
      const calculatedCalorieGoal = calculateCalorieGoal(weight, height, age, newMember.gender);
      
      const memberData = {
        userId: user.uid,
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        dateOfBirth: newMember.dateOfBirth,
        gender: newMember.gender,
        physicalStats: {
          height: {
            value: height,
            lastUpdated: currentDate
          },
          weight: {
            value: weight,
            lastUpdated: currentDate
          },
          age: age
        },
        nutritionalProfile: {
          dailyCalorieGoal: calculatedCalorieGoal,
          currentDailyCalories: 0
        },
        createdAt: currentDate
      };
      
      await addDoc(collection(db, 'familyMembers'), memberData);
      
      // Reset form and close modal
      setNewMember({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'other',
        height: '',
        weight: '',
        dailyCalorieGoal: '',
      });
      setModalVisible(false);
      
      // Refresh family members list
      fetchFamilyMembers(user.uid);
    } catch (error) {
      console.error('Error adding family member:', error);
    }
  };

  const navigateToMemberDetails = (memberId: string) => {
    router.push(`/family-member/${memberId}`);
  };

  return (
    <ParallaxScrollView 
      headerBackgroundColor={{ light: '#000', dark: '#000' }} 
      headerImage={undefined}
    >
      <View style={styles.container}>
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
        <Text style={styles.welcomeText}>
          {user ? `Welcome, ${user.email || 'User'}!` : 'Welcome!'}
        </Text>

        {/* Show login/register buttons if not logged in */}
        {!user && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.buttonWrapper} 
              onPress={() => router.push('/login')}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show family management UI if logged in */}
        {user && (
          <View style={styles.familyContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Your Family</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addButtonText}>+ Add Member</Text>
              </TouchableOpacity>
            </View>

            {familyMembers.length === 0 ? (
              <Text style={styles.emptyText}>
                No family members added yet. Add your first family member!
              </Text>
            ) : (
              <FlatList
                data={familyMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.memberCard}
                    onPress={() => navigateToMemberDetails(item.id)}
                  >
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.memberDetails}>
                        Age: {item.physicalStats.age} • 
                        Weight: {item.physicalStats.weight.value}kg • 
                        Height: {item.physicalStats.height.value}cm
                      </Text>
                      <View style={styles.calorieInfo}>
                        <Text style={styles.calorieText}>
                          Today: {item.nutritionalProfile.currentDailyCalories} / 
                          {item.nutritionalProfile.dailyCalorieGoal} cal
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.memberList}
              />
            )}

            <TouchableOpacity
              style={[styles.buttonWrapper, styles.logoutButton]}
              onPress={() => {
                const auth = getAuth();
                auth.signOut();
              }}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Family Member Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              
              <ScrollView style={styles.formContainer}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setNewMember({...newMember, firstName: text})}
                  value={newMember.firstName}
                  placeholder="First Name"
                  placeholderTextColor="#888"
                />
                
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setNewMember({...newMember, lastName: text})}
                  value={newMember.lastName}
                  placeholder="Last Name"
                  placeholderTextColor="#888"
                />
                
                <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setNewMember({...newMember, dateOfBirth: text})}
                  value={newMember.dateOfBirth}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#888"
                />
                
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderSelector}>
                  {['male', 'female', 'other'].map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderOption,
                        newMember.gender === gender && styles.selectedGender
                      ]}
                      onPress={() => setNewMember({...newMember, gender})}
                    >
                      <Text style={styles.genderText}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setNewMember({...newMember, height: text})}
                  value={newMember.height}
                  placeholder="Height in cm"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                />
                
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setNewMember({...newMember, weight: text})}
                  value={newMember.weight}
                  placeholder="Weight in kg"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                />
                
                <Text style={styles.inputLabel}>Daily Calorie Goal</Text>
                <Text style={styles.calculatedText}>
                  (Will be automatically calculated based on height, weight, age, and gender)
                </Text>
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={addFamilyMember}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 20,
  },
  reactLogo: {
    width: 100,
    height: 100,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: '#444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  familyContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  memberList: {
    width: '100%',
    marginBottom: 20,
  },
  memberCard: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  memberDetails: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  calorieInfo: {
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  calorieText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginVertical: 30,
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#c62828',
    marginTop: 20,
  },
  // Modal styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#222',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    maxHeight: 400,
  },
  inputLabel: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  genderSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  genderOption: {
    flex: 1,
    backgroundColor: '#333',
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  selectedGender: {
    backgroundColor: '#4a148c',
  },
  genderText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  saveButton: {
    backgroundColor: '#4a148c',
  },
});