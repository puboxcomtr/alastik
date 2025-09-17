// Otomatik Image Hostname Yönetimi
class ImageHostnameManager {
  private static instance: ImageHostnameManager;
  private allowedHostnames: Set<string> = new Set();
  private pendingHostnames: Set<string> = new Set();
  private isProcessing = false;
  private isInitialized = false;

  private constructor() {
    // SSR sırasında çalışmaması için kontrol
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  static getInstance(): ImageHostnameManager {
    if (!ImageHostnameManager.instance) {
      ImageHostnameManager.instance = new ImageHostnameManager();
    }
    return ImageHostnameManager.instance;
  }

  private initialize(): void {
    if (this.isInitialized) return;
    
    this.loadAllowedHostnames();
    this.setupImageErrorListener();
    this.isInitialized = true;
  }

  private loadAllowedHostnames(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('allowed_image_hostnames');
        if (saved) {
          const hostnames = JSON.parse(saved);
          this.allowedHostnames = new Set(hostnames);
        }
      }
    } catch (error) {
      console.warn('Hostname listesi yüklenirken hata:', error);
    }
  }

  private saveAllowedHostnames(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('allowed_image_hostnames', JSON.stringify([...this.allowedHostnames]));
      }
    } catch (error) {
      console.warn('Hostname listesi kaydedilirken hata:', error);
    }
  }

  private setupImageErrorListener(): void {
    // Image error'larını dinle
    if (typeof document !== 'undefined') {
      document.addEventListener('error', (event) => {
        const target = event.target as HTMLImageElement;
        if (target && target.tagName === 'IMG') {
          this.handleImageError(target.src);
        }
      }, true);
    }
  }

  private handleImageError(src: string): void {
    try {
      const url = new URL(src);
      const hostname = url.hostname;
      
      // Eğer hostname zaten izin verilenlerde yoksa ve işlenmemişse
      if (!this.allowedHostnames.has(hostname) && !this.pendingHostnames.has(hostname)) {
        this.pendingHostnames.add(hostname);
        this.processNewHostname(hostname);
      }
    } catch (error) {
      console.warn('Image error hostname parse hatası:', error);
    }
  }

  private async processNewHostname(hostname: string): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // Yeni hostname'i console'da göster
      console.warn(`🖼️ Yeni image hostname tespit edildi: ${hostname}`);
      console.warn(`📝 next.config.js'e eklenmesi gereken hostname:`);
      console.warn(`{
        protocol: 'https',
        hostname: '${hostname}',
        port: '',
        pathname: '/**',
      }`);
      
      // Hostname'i izin verilenler listesine ekle
      this.allowedHostnames.add(hostname);
      this.saveAllowedHostnames();
      
      // Kullanıcıya bildir
      this.showHostnameNotification(hostname);
      
    } catch (error) {
      console.error('Hostname işlenirken hata:', error);
    } finally {
      this.pendingHostnames.delete(hostname);
      this.isProcessing = false;
    }
  }

  private showHostnameNotification(hostname: string): void {
    // Toast notification göster
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.warning(
        `Yeni image hostname tespit edildi: ${hostname}. Lütfen next.config.js'e ekleyin.`,
        {
          autoClose: 8000,
          position: 'top-center'
        }
      );
    }
  }

  // Client-side'da initialize etmek için
  public ensureInitialized(): void {
    if (typeof window !== 'undefined' && !this.isInitialized) {
      this.initialize();
    }
  }

  // Manuel olarak hostname ekle
  addHostname(hostname: string): void {
    this.allowedHostnames.add(hostname);
    this.saveAllowedHostnames();
  }

  // İzin verilen hostname'leri getir
  getAllowedHostnames(): string[] {
    return [...this.allowedHostnames];
  }

  // Hostname izin verilen mi kontrol et
  isAllowed(hostname: string): boolean {
    return this.allowedHostnames.has(hostname);
  }
}

// Global instance
export const imageHostnameManager = ImageHostnameManager.getInstance();

// Window'a ekle (development için)
if (typeof window !== 'undefined') {
  (window as any).imageHostnameManager = imageHostnameManager;
} 