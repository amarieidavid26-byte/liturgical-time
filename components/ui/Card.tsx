import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  gradient?: boolean;
  colors?: readonly [string, string, ...string[]];
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  onPress, 
  gradient = false, 
  colors = ['#FFFFFF', '#FFFFFF'] 
}) => {
  const content = (
    <View style={[styles.card, Colors.shadows.medium]}>
      {children}
    </View>
  );
  
  if (gradient && colors.length >= 2) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} disabled={!onPress}>
        <LinearGradient
          colors={colors as readonly [string, string, ...string[]]}
          style={[styles.card, Colors.shadows.medium]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
      {content}
    </TouchableOpacity>
  ) : content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  }
});
