import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from '@/contexts/I18nContext';
import { apiService } from '@/services/apiService';

type Status = 'checking' | 'ok' | 'failed';

const BackendConnectionContext = createContext<{
  status: Status;
  retry: () => Promise<void>;
} | null>(null);

export function BackendConnectionProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');

  const check = useCallback(async () => {
    const ok = await apiService.checkBackend();
    setStatus(ok ? 'ok' : 'failed');
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const retry = useCallback(async () => {
    setStatus('checking');
    await check();
  }, [check]);

  const showBlock = status === 'failed' || status === 'checking';

  return (
    <BackendConnectionContext.Provider value={{ status, retry }}>
      {children}
      <Modal visible={showBlock} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.box}>
            {status === 'checking' ? (
              <ActivityIndicator size="large" />
            ) : (
              <>
                <Text style={styles.title}>{t('common.connectionError')}</Text>
                <Text style={styles.hint}>{t('common.connectionErrorHint')}</Text>
                <Pressable style={styles.button} onPress={retry}>
                  <Text style={styles.buttonText}>{t('common.retry')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </BackendConnectionContext.Provider>
  );
}

export function useBackendConnection() {
  const ctx = useContext(BackendConnectionContext);
  if (!ctx) throw new Error('useBackendConnection must be used within BackendConnectionProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
