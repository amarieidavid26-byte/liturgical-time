import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import { Text, View } from 'react-native';
import Colors from '@/constants/Colors';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liturgical Time</Text>
      <Text style={styles.version}>v2.0.0</Text>
      <View style={styles.separator} />
      <Text style={styles.description}>
        Un calendar ortodox pentru antreprenorii români.{'\n'}
        Evitați conflictele de programare cu slujbele bisericești și sărbătorile.
      </Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warm.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.warm.text,
  },
  version: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
    marginTop: 4,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: Colors.warm.divider,
  },
  description: {
    fontSize: 16,
    color: Colors.warm.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
