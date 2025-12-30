
import { dataService } from './dataService';

const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Declare global Google objects loaded by scripts in index.html
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

class GoogleDriveService {
  private tokenClient: any;
  private accessToken: string | null = null;
  private isGapiInitialized = false;

  constructor() {
    // Attempt to initialize if scripts are already loaded
    this.init();
  }

  public async init() {
    if (!CLIENT_ID) {
        console.warn('Google Client ID not found. Drive backup disabled.');
        return;
    }

    // Wait for scripts to load if not ready
    if (!window.google || !window.gapi) {
        setTimeout(() => this.init(), 1000);
        return;
    }

    try {
        // Initialize Identity Services (GIS)
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
                this.accessToken = tokenResponse.access_token;
                // Optionally store expiration logic here
                const settings = dataService.getSettings();
                dataService.saveSettings({ ...settings, googleDriveConnected: true });
            },
        });

        // Initialize GAPI client
        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                // apiKey: API_KEY, // Not strictly needed for just upload with token
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            this.isGapiInitialized = true;
        });
    } catch (e) {
        console.error("Error initializing Google Drive Service:", e);
    }
  }

  public async signIn(): Promise<boolean> {
      if (!this.tokenClient) {
          alert("El servicio de Google Drive no está inicializado. Verifica tu conexión o el Client ID.");
          return false;
      }
      
      return new Promise((resolve) => {
          // Override callback for this specific request to know when it finishes
          this.tokenClient.callback = (resp: any) => {
              if (resp.error) {
                  resolve(false);
                  throw resp;
              }
              this.accessToken = resp.access_token;
              const settings = dataService.getSettings();
              dataService.saveSettings({ ...settings, googleDriveConnected: true });
              resolve(true);
          };
          
          if (this.accessToken === null) {
              // Prompt the user to select an account.
              this.tokenClient.requestAccessToken({prompt: 'consent'});
          } else {
              // Skip display of account chooser and consent dialog.
              this.tokenClient.requestAccessToken({prompt: ''});
          }
      });
  }

  public signOut() {
      if (window.google && window.google.accounts && this.accessToken) {
          window.google.accounts.oauth2.revoke(this.accessToken, () => {
              this.accessToken = null;
              const settings = dataService.getSettings();
              dataService.saveSettings({ ...settings, googleDriveConnected: false });
              console.log('Google Access Token Revoked');
          });
      }
  }

  public async createBackup(): Promise<{ success: boolean; message: string }> {
      if (!this.accessToken) {
          const signedIn = await this.signIn();
          if (!signedIn) return { success: false, message: "No se pudo autenticar con Google." };
      }

      try {
          // 1. Gather Data
          const backupData = {
              timestamp: new Date().toISOString(),
              appName: 'Sport Business Suite',
              players: dataService.getPlayers(),
              notes: dataService.getNotes(),
              users: dataService.getUsers(),
              settings: dataService.getSettings()
          };

          const fileContent = JSON.stringify(backupData, null, 2);
          const fileName = `SBS_Backup_${new Date().toISOString().split('T')[0]}.json`;

          // 2. Create Multipart Request Body
          const metadata = {
              name: fileName,
              mimeType: 'application/json',
              description: 'Backup automático de Sport Business Suite'
          };

          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', new Blob([fileContent], { type: 'application/json' }));

          // 3. Upload using fetch (GAPI client upload is simpler via fetch for multipart)
          const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                  'Authorization': 'Bearer ' + this.accessToken,
              },
              body: form
          });

          if (!response.ok) {
              throw new Error(await response.text());
          }
          
          const result = await response.json();

          // 4. Update local state
          const settings = dataService.getSettings();
          dataService.saveSettings({ ...settings, lastBackupDate: new Date().toISOString() });

          return { success: true, message: `Respaldo creado con éxito (ID: ${result.id})` };

      } catch (error: any) {
          console.error('Backup Error:', error);
          // If 401, token might be expired
          if (error.message && error.message.includes('401')) {
              this.accessToken = null; // force re-login next time
              return { success: false, message: "Sesión expirada. Intenta de nuevo." };
          }
          return { success: false, message: "Error al subir a Drive: " + (error.message || 'Desconocido') };
      }
  }

  public async checkAndRunAutoBackup() {
      const settings = dataService.getSettings();
      if (!settings.googleDriveConnected || settings.backupFrequency === 'never') return;

      const lastBackup = settings.lastBackupDate ? new Date(settings.lastBackupDate).getTime() : 0;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      let shouldBackup = false;

      if (settings.backupFrequency === 'daily' && (now - lastBackup > oneDay)) {
          shouldBackup = true;
      } else if (settings.backupFrequency === 'weekly' && (now - lastBackup > oneDay * 7)) {
          shouldBackup = true;
      } else if (settings.backupFrequency === 'monthly' && (now - lastBackup > oneDay * 30)) {
          shouldBackup = true;
      }

      if (shouldBackup) {
          console.log("Starting automatic backup...");
          // We assume user might have a valid token session or we try to get one silently
          // Note: Browser might block this if it requires popup without user interaction.
          // Ideally, we rely on the user having been active recently or token validity.
          await this.createBackup();
      }
  }
}

export const googleDriveService = new GoogleDriveService();
