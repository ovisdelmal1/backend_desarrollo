import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { ScreenHeader } from '../../components/ScreenHeader';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

import { spacing } from '../../theme';

import { validateRegisterStep2 } from '../../utils/validation';
import * as authApi from '../../services/authApi';
import { ApiError } from '../../services/api';

import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

export function RegisterStep1Screen({ navigation }) {
  const { setRegisterDraft } = useAuth();
  const { showDialog } = useDialog();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const fieldErrors = validateRegisterStep2({ email, password, confirmPassword });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setLoading(true);
    try {
      const data = await authApi.register(email, password);
      setRegisterDraft({ authResponse: data });
      navigation.navigate('RegisterStep2');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_EXISTS') {
        showDialog({
          title: 'Error',
          message: 'Ya existe una cuenta con ese email',
          variant: 'error',
        });
      } else {
        showDialog({
          title: 'Error',
          message: error.message || 'No se pudo crear la cuenta',
          variant: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenLayout shape="lightBlue" safe>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="Crear cuenta"
          subtitle="Paso 1 de 2"
          shape="brown"
          onBack={() => navigation.goBack()}
          embedded
        />

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            error={errors.email}
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Input
            label="Confirmar contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Continuar"
            onPress={handleContinue}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});