class ImageHostnameManager {
  private static instance: ImageHostnameManager;
  private allowedHostnames: Set<string> = new Set();
  private pendingHostnames: Set<string> = new Set();
  private isProcessing = false;
  private isInitialized = false;

  private constructor() {
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
      console.warn(`🖼️ Yeni image hostname tespit edildi: ${hostname}`);
      console.warn(`📝 next.config.js'e eklenmesi gereken hostname:`);
      console.warn(`{
        protocol: 'https',
        hostname: '${hostname}',
        port: '',
        pathname: '/**',
      }`);
      
      this.allowedHostnames.add(hostname);
      this.saveAllowedHostnames();
      
      this.showHostnameNotification(hostname);
      
    } catch (error) {
      console.error('Hostname işlenirken hata:', error);
    } finally {
      this.pendingHostnames.delete(hostname);
      this.isProcessing = false;
    }
  }

  private showHostnameNotification(hostname: string): void {
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

  public ensureInitialized(): void {
    if (typeof window !== 'undefined' && !this.isInitialized) {
      this.initialize();
    }
  }

  addHostname(hostname: string): void {
    this.allowedHostnames.add(hostname);
    this.saveAllowedHostnames();
  }

  getAllowedHostnames(): string[] {
    return [...this.allowedHostnames];
  }

  isAllowed(hostname: string): boolean {
    return this.allowedHostnames.has(hostname);
  }
}

export const imageHostnameManager = ImageHostnameManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).imageHostnameManager = imageHostnameManager;
} 