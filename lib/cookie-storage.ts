'use client';

// Cookie-based storage for form data - survives Clear-Site-Data headers
const FORM_DATA_COOKIE = 'lavsit_form_data';
const FORM_VERSION_COOKIE = 'lavsit_form_version';
const MAX_COOKIE_SIZE = 4000; // Safe limit for cookie size
const COOKIE_EXPIRY_DAYS = 30;

interface CookieOptions {
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
}

class CookieStorage {
  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  private setCookie(name: string, value: string, options: CookieOptions = {}): boolean {
    try {
      if (!this.isClient()) {
        console.warn('[COOKIE] Not available in SSR');
        return false;
      }

      // Check cookie size limit
      if (value.length > MAX_COOKIE_SIZE) {
        console.warn(`[COOKIE] Value too large for ${name}: ${value.length} chars`);
        return false;
      }

      const expires = options.expires || new Date(Date.now() + COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const path = options.path || '/';
      const secure = options.secure !== undefined ? options.secure : window.location.protocol === 'https:';
      const sameSite = options.sameSite || 'Lax';

      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      cookieString += `; expires=${expires.toUTCString()}`;
      cookieString += `; path=${path}`;
      
      if (secure) {
        cookieString += '; Secure';
      }
      
      cookieString += `; SameSite=${sameSite}`;

      document.cookie = cookieString;
      console.log(`[COOKIE] Set ${name} (${value.length} chars)`);
      return true;
    } catch (error) {
      console.error(`[COOKIE] Failed to set ${name}:`, error);
      return false;
    }
  }

  private getCookie(name: string): string | null {
    try {
      if (!this.isClient()) {
        return null;
      }

      const nameEQ = encodeURIComponent(name) + '=';
      const cookies = document.cookie.split(';');
      
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          const value = decodeURIComponent(cookie.substring(nameEQ.length));
          console.log(`[COOKIE] Retrieved ${name} (${value.length} chars)`);
          return value;
        }
      }
      
      console.log(`[COOKIE] No cookie found for ${name}`);
      return null;
    } catch (error) {
      console.error(`[COOKIE] Failed to get ${name}:`, error);
      return null;
    }
  }

  private removeCookie(name: string): boolean {
    try {
      if (!this.isClient()) {
        return false;
      }

      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
      console.log(`[COOKIE] Removed ${name}`);
      return true;
    } catch (error) {
      console.error(`[COOKIE] Failed to remove ${name}:`, error);
      return false;
    }
  }

  // Compress JSON string for cookie storage
  private compressData(data: string): string {
    try {
      // Simple compression: remove unnecessary whitespace and use shorter field names
      const parsed = JSON.parse(data);
      
      // Create a compressed version with shorter keys
      const compressed = {
        v: parsed.version,
        t: parsed.timestamp,
        c: parsed.cargos,
        fc: parsed.fromCity,
        tc: parsed.toCity,
        fa: parsed.fromAddress,
        ta: parsed.toAddress,
        dv: parsed.declaredValue,
        np: parsed.needPackaging,
        nl: parsed.needLoading,
        nc: parsed.needCarry,
        f: parsed.floor,
        hfl: parsed.hasFreightLift,
        ni: parsed.needInsurance,
        ft: parsed.fromTerminal,
        tt: parsed.toTerminal,
        fad: parsed.fromAddressDelivery,
        tad: parsed.toAddressDelivery,
        flw: parsed.fromLavsiteWarehouse,
        sp: parsed.selectedProducts,
        ec: parsed.enabledCompanies
      };

      return JSON.stringify(compressed);
    } catch (error) {
      console.warn('[COOKIE] Failed to compress data, using original:', error);
      return data;
    }
  }

  // Decompress JSON string from cookie storage
  private decompressData(data: string): string {
    try {
      const compressed = JSON.parse(data);
      
      // Check if it's already in full format
      if (compressed.version) {
        return data;
      }
      
      // Restore full field names
      const decompressed = {
        version: compressed.v,
        timestamp: compressed.t,
        cargos: compressed.c,
        fromCity: compressed.fc,
        toCity: compressed.tc,
        fromAddress: compressed.fa,
        toAddress: compressed.ta,
        declaredValue: compressed.dv,
        needPackaging: compressed.np,
        needLoading: compressed.nl,
        needCarry: compressed.nc,
        floor: compressed.f,
        hasFreightLift: compressed.hfl,
        needInsurance: compressed.ni,
        fromTerminal: compressed.ft,
        toTerminal: compressed.tt,
        fromAddressDelivery: compressed.fad,
        toAddressDelivery: compressed.tad,
        fromLavsiteWarehouse: compressed.flw,
        selectedProducts: compressed.sp,
        enabledCompanies: compressed.ec
      };

      return JSON.stringify(decompressed);
    } catch (error) {
      console.warn('[COOKIE] Failed to decompress data, using original:', error);
      return data;
    }
  }

  // Split large data into multiple cookies if needed
  private setLargeData(baseName: string, data: string): boolean {
    try {
      const compressed = this.compressData(data);
      
      if (compressed.length <= MAX_COOKIE_SIZE) {
        // Single cookie is enough
        this.removeCookie(`${baseName}_parts`);
        this.removeCookie(`${baseName}_1`);
        this.removeCookie(`${baseName}_2`);
        this.removeCookie(`${baseName}_3`);
        return this.setCookie(baseName, compressed);
      }

      // Split into multiple parts
      const parts: string[] = [];
      for (let i = 0; i < compressed.length; i += MAX_COOKIE_SIZE) {
        parts.push(compressed.substring(i, i + MAX_COOKIE_SIZE));
      }

      if (parts.length > 3) {
        console.error(`[COOKIE] Data too large even when split: ${parts.length} parts`);
        return false;
      }

      // Set number of parts
      this.setCookie(`${baseName}_parts`, parts.length.toString());
      
      // Set each part
      let success = true;
      for (let i = 0; i < parts.length; i++) {
        success = success && this.setCookie(`${baseName}_${i + 1}`, parts[i]);
      }

      // Clear main cookie
      this.removeCookie(baseName);
      
      console.log(`[COOKIE] Split data into ${parts.length} parts`);
      return success;
    } catch (error) {
      console.error('[COOKIE] Failed to set large data:', error);
      return false;
    }
  }

  // Retrieve large data from multiple cookies
  private getLargeData(baseName: string): string | null {
    try {
      // Try single cookie first
      const singleData = this.getCookie(baseName);
      if (singleData) {
        return this.decompressData(singleData);
      }

      // Try multi-part cookies
      const partsStr = this.getCookie(`${baseName}_parts`);
      if (!partsStr) {
        return null;
      }

      const numParts = parseInt(partsStr);
      if (isNaN(numParts) || numParts <= 0) {
        return null;
      }

      let combined = '';
      for (let i = 1; i <= numParts; i++) {
        const part = this.getCookie(`${baseName}_${i}`);
        if (!part) {
          console.error(`[COOKIE] Missing part ${i} of ${numParts}`);
          return null;
        }
        combined += part;
      }

      console.log(`[COOKIE] Reconstructed data from ${numParts} parts`);
      return this.decompressData(combined);
    } catch (error) {
      console.error('[COOKIE] Failed to get large data:', error);
      return null;
    }
  }

  // Remove all cookies related to large data
  private removeLargeData(baseName: string): boolean {
    let success = true;
    
    // Remove main cookie
    success = success && this.removeCookie(baseName);
    
    // Remove parts info
    const partsStr = this.getCookie(`${baseName}_parts`);
    if (partsStr) {
      const numParts = parseInt(partsStr);
      if (!isNaN(numParts)) {
        for (let i = 1; i <= numParts; i++) {
          success = success && this.removeCookie(`${baseName}_${i}`);
        }
      }
      success = success && this.removeCookie(`${baseName}_parts`);
    }

    return success;
  }

  // Public API
  saveFormData(formData: string): boolean {
    return this.setLargeData(FORM_DATA_COOKIE, formData);
  }

  loadFormData(): string | null {
    return this.getLargeData(FORM_DATA_COOKIE);
  }

  saveFormVersion(version: string): boolean {
    return this.setCookie(FORM_VERSION_COOKIE, version);
  }

  loadFormVersion(): string | null {
    return this.getCookie(FORM_VERSION_COOKIE);
  }

  clearFormData(): boolean {
    const success1 = this.removeLargeData(FORM_DATA_COOKIE);
    const success2 = this.removeCookie(FORM_VERSION_COOKIE);
    return success1 && success2;
  }

  // Get available cookie space
  getAvailableSpace(): number {
    if (!this.isClient()) return 0;
    
    const currentCookies = document.cookie;
    const remainingSpace = MAX_COOKIE_SIZE - currentCookies.length;
    return Math.max(0, remainingSpace);
  }

  // Test if cookies are working
  testCookies(): boolean {
    const testKey = 'test_cookie';
    const testValue = 'test_value';
    
    if (!this.setCookie(testKey, testValue)) {
      return false;
    }
    
    const retrieved = this.getCookie(testKey);
    this.removeCookie(testKey);
    
    return retrieved === testValue;
  }
}

// Singleton instance
const cookieStorage = new CookieStorage();

// Public API functions
export const saveFormDataToCookies = (formData: string): boolean => {
  return cookieStorage.saveFormData(formData);
};

export const loadFormDataFromCookies = (): string | null => {
  return cookieStorage.loadFormData();
};

export const saveFormVersionToCookies = (version: string): boolean => {
  return cookieStorage.saveFormVersion(version);
};

export const loadFormVersionFromCookies = (): string | null => {
  return cookieStorage.loadFormVersion();
};

export const clearFormDataFromCookies = (): boolean => {
  return cookieStorage.clearFormData();
};

export const isCookieStorageAvailable = (): boolean => {
  return cookieStorage.testCookies();
};

export const getCookieAvailableSpace = (): number => {
  return cookieStorage.getAvailableSpace();
};

console.log('[COOKIE] Storage module initialized');