import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '@store/themeStore';
import { Button } from '@components/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { colors } = useThemeStore.getState();
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.code, { color: colors.error }]}>Oops!</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            An unexpected error occurred. Try reloading the screen.
          </Text>
          <Button title="Reload" onPress={this.handleReset} variant="primary" style={styles.button} />
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  code: { fontSize: 48, fontWeight: '900' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  message: { fontSize: 14, textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20 },
  button: { marginTop: 24 },
});
