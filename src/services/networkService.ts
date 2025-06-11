import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { logError, captureMessage } from './loggingService';

type ConnectionCallback = (isConnected: boolean) => void;

/**
 * Servicio para manejar el estado de conectividad a internet
 */
export class NetworkService {
  private isConnected: boolean = true;
  private listeners: ConnectionCallback[] = [];
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  
  /**
   * Inicializa el monitoreo de conectividad
   */
  initialize(): void {
    try {
      if (this.netInfoUnsubscribe) {
        return; // Ya inicializado
      }
      
      // Verificar el estado inicial
      NetInfo.fetch().then(state => {
        this.handleConnectionChange(state);
      });
      
      // Suscribirse a cambios
      this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleConnectionChange);
      console.log('>>> NetworkService: Monitoreo de conectividad iniciado');
    } catch (error) {
      logError(error, 'NetworkService_initialize');
    }
  }
  
  /**
   * Manejador de cambios de conectividad
   */
  private handleConnectionChange = (state: NetInfoState): void => {
    try {
      const connected = state.isConnected === true;
      
      // Solo notificar en cambios
      if (this.isConnected !== connected) {
        this.isConnected = connected;
        console.log(`>>> NetworkService: Estado de conexión cambiado a: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`);
        
        // Notificar a los listeners
        this.notifyListeners();
        
        // Registrar para diagnóstico
        captureMessage(`Cambio en conexión: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`);
      }
    } catch (error) {
      logError(error, 'NetworkService_handleConnectionChange');
    }
  };
  
  /**
   * Notificar a todos los listeners registrados
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.isConnected);
      } catch (error) {
        console.error('Error en listener de NetworkService:', error);
      }
    });
  }
  
  /**
   * Obtener el estado actual de conectividad
   */
  getCurrentStatus(): boolean {
    return this.isConnected;
  }
  
  /**
   * Registrar un callback para cambios de conectividad
   * @returns Función para eliminar el listener
   */
  addListener(callback: ConnectionCallback): () => void {
    this.listeners.push(callback);
    
    // Notificar estado actual inmediatamente
    try {
      callback(this.isConnected);
    } catch (error) {
      console.error('Error notificando estado inicial:', error);
    }
    
    // Devolver función para eliminar el listener
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Detener el monitoreo de conectividad
   */
  cleanup(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.listeners = [];
  }
}

// Exportar una única instancia
export const networkService = new NetworkService();

// Inicializar inmediatamente
networkService.initialize(); 