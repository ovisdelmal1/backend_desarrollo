import { useState } from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/Input';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import { Button } from '../../components/Button';
import { spacing } from '../../theme';
import { validateKyc } from '../../utils/validation';
import { submitKyc } from '../../services/loteApi';
import { ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

export function RegisterStep2Screen({ navigation }) {
  const { registerDraft, setRegisterDraft, setUser } = useAuth();
  const { showDialog } = useDialog();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [dniFront, setDniFront] = useState(null);
  const [dniBack, setDniBack] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(goPayments) {
    const fieldErrors = validateKyc({ first_name: firstName, last_name: lastName, legal_address: legalAddress });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setLoading(true);
    try {
      await submitKyc({
        first_name: firstName,
        last_name: lastName,
        dniFront,
        dniBack,
        legal_address: legalAddress,
        country,
      });

      if (!goPayments && registerDraft?.authResponse?.user) {
        setUser(registerDraft.authResponse.user);
      }
      setRegisterDraft({});

      if (goPayments) {
        navigation.navigate('PaymentMethods');
      } else {
        showDialog({
          title: 'Cuenta creada',
          message: 'Tu identidad fue enviada correctamente.',
          variant: 'success',
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setErrors(error.errors);
      } else {
        showDialog({
          title: 'Error',
          message: error.message || 'No se pudo enviar los datos de KYC',
          variant: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenLayout shape="lavender" safe>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Verificación de identidad" subtitle="Paso 2 de 2" shape="brown" onBack={() => navigation.goBack()} embedded />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Input
            label="Nombre"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Melisa"
            error={errors.first_name}
          />
          <Input
            label="Apellido"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Villanueva"
            error={errors.last_name}
          />
          <Input
            label="Dirección"
            value={legalAddress}
            onChangeText={setLegalAddress}
            placeholder="Calle Falsa 123"
            error={errors.legal_address}
          />
          <Input
            label="País"
            value={country}
            onChangeText={setCountry}
            placeholder="Argentina"
            error={errors.country}
          />

          <ImagePickerButton
            label="DNI - Frente"
            image={dniFront}
            onImageSelected={setDniFront}
            error={errors.dni_front}
          />
          <ImagePickerButton
            label="DNI - Dorso"
            image={dniBack}
            onImageSelected={setDniBack}
            error={errors.dni_back}
          />

          <Button title="Enviar KYC y agregar medio de pago" onPress={() => handleSubmit(true)} loading={loading} />
          <Button title="Enviar KYC y continuar" variant="outline" onPress={() => handleSubmit(false)} disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.sm },
});
