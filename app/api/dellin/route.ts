import { NextRequest, NextResponse } from 'next/server';
import { apiRequestWithTimeout, PerformanceMonitor } from '@/lib/api-utils';
import fs from 'fs';
import path from 'path';

// ── Credentials (will be moved to env vars after migration) ──
const DELLIN_APPKEY = process.env.DELLIN_APP_KEY || 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B';
const DELLIN_LOGIN = process.env.DELLIN_LOGIN || 'service@lavsit.ru';
const DELLIN_PASSWORD = process.env.DELLIN_PASSWORD || 'edcwsx123QAZ';

const DADATA_API_KEY = process.env.DADATA_API_KEY || 'eb87bbb3789bb43ed465f796892ea951f9e91008';
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY || '90f3541a30ef6e1c40e665b69f1aa6d74242c3f2';

// ── Session cache ──
let cachedSession: { id: string; expiresAt: number } | null = null;

async function getSessionId(): Promise<string | null> {
  // Return cached session if still valid (1 hour TTL with 5 min buffer)
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return cachedSession.id;
  }

  try {
    const res = await apiRequestWithTimeout(
      'https://api.dellin.ru/v3/auth/login.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appkey: DELLIN_APPKEY,
          login: DELLIN_LOGIN,
          password: DELLIN_PASSWORD,
        }),
      },
      { timeout: 10000 }
    );

    const data = await res.json();
    const sessionID =
      data.data?.sessionID || data.sessionID || data.data?.session || null;

    if (res.ok && sessionID) {
      cachedSession = {
        id: sessionID,
        expiresAt: Date.now() + 55 * 60 * 1000, // 55 min
      };
      return sessionID;
    }

    console.error('❌ Dellin auth failed:', data);
    return null;
  } catch (error) {
    console.error('❌ Dellin auth connection error:', error);
    return null;
  }
}

/** Invalidate cached session (used on auth errors to force re-login) */
function invalidateSession() {
  cachedSession = null;
}

// ── Local city directory ──
let citiesCache: any[] | null = null;

function loadCities(): any[] | null {
  if (citiesCache) return citiesCache;
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'dellin-cities.json');
    if (!fs.existsSync(filePath)) {
      // Try alternative location
      const altPath = path.join(process.cwd(), 'data', 'dellin-cities.json');
      if (fs.existsSync(altPath)) {
        const raw = fs.readFileSync(altPath, 'utf-8');
        citiesCache = JSON.parse(raw).cities || [];
        return citiesCache;
      }
      console.warn('⚠️ dellin-cities.json not found');
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    citiesCache = JSON.parse(raw).cities || [];
    return citiesCache;
  } catch (e) {
    console.error('❌ Error loading cities:', e);
    return null;
  }
}

function getCityIDFromLocal(cityName: string): string | null {
  const cities = loadCities();
  if (!cities) return null;

  const norm = cityName
    .toLowerCase()
    .trim()
    .replace(/^г\s+/, '')
    .replace(/^город\s+/, '')
    .replace(/\s+/g, ' ');

  for (const city of cities) {
    if (city.name.toLowerCase() === norm) return city.cityID;
    for (const s of city.searchStrings || []) {
      if (s === norm) return city.cityID;
    }
  }
  return null;
}

// ── Dellin KLADR (city directory) API ──
async function findCityInDirectory(
  cityName: string
): Promise<{ cityID: number; code: string } | null> {
  try {
    const norm = cityName
      .toLowerCase()
      .trim()
      .replace(/^г\s+/, '')
      .replace(/^город\s+/, '')
      .replace(/\s+/g, ' ');

    const res = await apiRequestWithTimeout(
      'https://api.dellin.ru/v2/public/kladr.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appkey: DELLIN_APPKEY, q: norm, limit: 10 }),
      },
      { timeout: 10000 }
    );

    const data = await res.json();
    if (!res.ok || !data.cities?.length) return null;

    let best =
      data.cities.find(
        (c: any) =>
          c.searchString?.toLowerCase() === norm ||
          c.aString?.toLowerCase().includes(norm)
      ) ||
      data.cities.find((c: any) => c.isTerminal === 1) ||
      data.cities[0];

    return best ? { cityID: best.cityID, code: best.code } : null;
  } catch {
    return null;
  }
}

// ── Terminal search ──
async function findTerminal(
  citySearch: string,
  direction: 'arrival' | 'derival'
): Promise<string | null> {
  try {
    const sessionID = await getSessionId();
    if (!sessionID) return null;

    const res = await apiRequestWithTimeout(
      'https://api.dellin.ru/v1/public/request_terminals.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appkey: DELLIN_APPKEY,
          sessionID,
          search: citySearch,
          direction,
        }),
      },
      { timeout: 10000 }
    );

    const data = await res.json();
    if (!res.ok || !data.terminals?.length) return null;

    return data.terminals[0].id.toString();
  } catch {
    return null;
  }
}

// ── DaData address normalization (server-to-server) ──
async function normalizeAddress(address: string): Promise<string> {
  try {
    const res = await apiRequestWithTimeout(
      'https://cleaner.dadata.ru/api/v1/clean/address',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Token ${DADATA_API_KEY}`,
          'X-Secret': DADATA_SECRET_KEY,
        },
        body: JSON.stringify([address]),
      },
      { timeout: 10000 }
    );

    const data = await res.json();
    if (res.ok && Array.isArray(data) && data.length > 0) {
      return formatAddressForDellin(data[0]) || address;
    }
    return address;
  } catch {
    return address;
  }
}

function formatAddressForDellin(d: any): string {
  const parts: string[] = [];
  if (d.region_with_type) parts.push(d.region_with_type);
  if (d.city_with_type) parts.push(d.city_with_type);
  else if (d.settlement_with_type) parts.push(d.settlement_with_type);
  if (d.street_with_type) parts.push(d.street_with_type);
  if (d.house) {
    let h = `д. ${d.house}`;
    if (d.block) h += `, корп. ${d.block}`;
    parts.push(h);
  }
  return parts.join(', ') || d.result || '';
}

// ── Package UID (fixed) ──
const FIXED_PACKAGE_UID = '0xad97901b0ecef0f211e889fcf4624fec';

// ── Date helper ──
function getDateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// ══════════════════════════════════════════════════════════════
// POST /api/dellin  — main calculation endpoint
// ══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('dellin_calculate');

  try {
    const body = await request.json();

    // ── Test endpoint ──
    if (body.method === 'test') {
      const sessionID = await getSessionId();
      const timing = endTiming();
      return NextResponse.json({
        status: sessionID ? 'OK' : 'ERROR',
        service: 'Деловые Линии',
        message: sessionID
          ? 'Авторизация успешна'
          : 'Не удалось авторизоваться',
        timing,
      });
    }

    // ── Full calculation ──
    const {
      fromCity,
      toCity,
      fromAddress,
      toAddress,
      fromAddressDelivery,
      toAddressDelivery,
      cargos,
      declaredValue,
      needPackaging,
      needCarry,
      floor,
      hasFreightLift,
    } = body;

    if (!fromCity || !toCity || !cargos?.length) {
      endTiming();
      return NextResponse.json(
        { error: 'Missing required fields: fromCity, toCity, cargos' },
        { status: 400 }
      );
    }

    const apiUrl = 'https://api.dellin.ru/v2/calculator.json';
    const maxRetries = 2;
    const maxDaysToTry = 14;

    // Step 1: Auth
    let sessionID = await getSessionId();
    if (!sessionID) {
      endTiming();
      return NextResponse.json({
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: 'Не удалось получить sessionID',
        apiUrl,
      });
    }

    // Step 2: Cargo dimensions
    const totalWeight = cargos.reduce((s: number, c: any) => s + c.weight, 0);
    const totalVolume = cargos.reduce(
      (s: number, c: any) =>
        s + (c.length * c.width * c.height) / 1_000_000,
      0
    );
    const maxLength = Math.max(...cargos.map((c: any) => c.length)) / 100;
    const maxWidth = Math.max(...cargos.map((c: any) => c.width)) / 100;
    const maxHeight = Math.max(...cargos.map((c: any) => c.height)) / 100;

    // Step 3: Terminals / normalized addresses
    let fromTerminalId: string | null = null;
    let toTerminalId: string | null = null;
    let normFrom: string | null = null;
    let normTo: string | null = null;

    if (!fromAddressDelivery) {
      fromTerminalId = await findTerminal(fromCity, 'derival');
    } else {
      normFrom = await normalizeAddress(fromAddress || fromCity);
    }

    if (!toAddressDelivery) {
      toTerminalId = await findTerminal(toCity, 'arrival');
    } else {
      normTo = await normalizeAddress(toAddress || toCity);
    }

    // Validate
    if (!fromAddressDelivery && !fromTerminalId) {
      endTiming();
      return NextResponse.json({
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: `Не найден терминал ДЛ в городе отправления: ${fromCity}`,
        apiUrl,
      });
    }
    if (!toAddressDelivery && !toTerminalId) {
      endTiming();
      return NextResponse.json({
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: `Не найден терминал ДЛ в городе назначения: ${toCity}`,
        apiUrl,
      });
    }
    if (fromAddressDelivery && !normFrom) {
      endTiming();
      return NextResponse.json({
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: `Не удалось обработать адрес отправления: ${fromAddress || fromCity}`,
        apiUrl,
      });
    }
    if (toAddressDelivery && !normTo) {
      endTiming();
      return NextResponse.json({
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: `Не удалось обработать адрес назначения: ${toAddress || toCity}`,
        apiUrl,
      });
    }

    // Step 4: Build request body
    const packageUid = needPackaging ? FIXED_PACKAGE_UID : null;

    const requestData: any = {
      appkey: DELLIN_APPKEY,
      sessionID,
      delivery: {
        deliveryType: { type: 'auto' },
        derival: {
          produceDate: getDateStr(0),
          variant: fromAddressDelivery ? 'address' : 'terminal',
          ...(fromAddressDelivery
            ? { address: { search: normFrom || fromAddress || fromCity } }
            : { terminalID: fromTerminalId }),
          time: {
            worktimeStart: '10:00',
            worktimeEnd: '18:00',
            breakStart: '13:00',
            breakEnd: '14:00',
            exactTime: false,
          },
        },
        arrival: {
          variant: toAddressDelivery ? 'address' : 'terminal',
          ...(toAddressDelivery
            ? { address: { search: normTo || toAddress || toCity } }
            : { terminalID: toTerminalId }),
          time: {
            worktimeStart: '10:00',
            worktimeEnd: '18:00',
            breakStart: '13:00',
            breakEnd: '14:00',
            exactTime: false,
          },
          ...(needCarry
            ? {
                handling: {
                  freightLift: hasFreightLift || false,
                  toFloor: floor || 0,
                  carry: 0,
                },
              }
            : {}),
        },
        ...(needPackaging && packageUid
          ? { packages: [{ uid: packageUid, count: 1 }] }
          : {}),
      },
      cargo: {
        quantity: cargos.length,
        length: maxLength,
        width: maxWidth,
        height: maxHeight,
        weight: totalWeight,
        totalVolume,
        totalWeight,
        oversizedWeight: 0,
        oversizedVolume: 0,
        hazardClass: 0,
        freightName: 'Мебель',
        insurance: {
          statedValue: declaredValue || 0,
          term: true,
        },
      },
      payment: {
        type: 'noncash',
        paymentCitySearch: { search: fromCity },
      },
    };

    // Step 5: Execute with date retry & auth retry
    let response: Response | null = null;
    let data: any = null;
    let successfulDate: string | null = null;
    let lastError: string | null = null;

    for (let dayOffset = 0; dayOffset <= maxDaysToTry; dayOffset++) {
      const date = getDateStr(dayOffset);
      requestData.delivery.derival.produceDate = date;

      let requestOk = false;
      let dateUnavailable = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          response = await apiRequestWithTimeout(
            apiUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(requestData),
            },
            { timeout: 30000 }
          );

          data = await response.json();
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Network error';
          break;
        }

        // Check for auth errors
        const isAuthError =
          response.status === 401 ||
          response.status === 403 ||
          (response.status === 400 &&
            data?.errors?.some(
              (e: any) =>
                e.detail?.toLowerCase()?.includes('session') ||
                e.detail?.toLowerCase()?.includes('auth') ||
                e.detail?.toLowerCase()?.includes('invalid')
            ));

        if (isAuthError && attempt < maxRetries) {
          invalidateSession();
          const newSid = await getSessionId();
          if (newSid) {
            requestData.sessionID = newSid;
            sessionID = newSid;
            continue;
          }
          break;
        }

        // Check for date error 180012
        if (response.status === 400 && data?.errors) {
          dateUnavailable = data.errors.some(
            (e: any) =>
              e.code === 180012 ||
              e.code === '180012' ||
              e.title?.toLowerCase().includes('дата недоступна') ||
              e.detail?.toLowerCase().includes('дата недоступна')
          );
          if (dateUnavailable) {
            lastError = `Дата ${date} недоступна`;
            break;
          }
        }

        // Success check
        if (response.ok && data?.data && data.metadata?.status === 200) {
          successfulDate = date;
          requestOk = true;
          break;
        }

        // Other error
        lastError =
          data?.metadata?.detail ||
          data?.errors?.[0]?.detail ||
          `HTTP ${response.status}`;
        break;
      }

      if (requestOk) break;
      if (dateUnavailable) continue;
      break; // Non-date error → stop trying
    }

    // Step 6: Process result
    if (!successfulDate || !response || !data?.data) {
      const timing = endTiming();
      return NextResponse.json({
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: lastError || 'Ошибка расчета Деловые Линии',
        requestData,
        responseData: data,
        apiUrl,
        timing,
      });
    }

    // Calculate price (already all-inclusive)
    const totalPrice = data.data.price || 0;

    // Calculate delivery days
    let deliveryDays = 0;
    const findDate = (obj: any, field: string): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const [k, v] of Object.entries(obj)) {
        if (k === field && typeof v === 'string') return v;
        if (typeof v === 'object' && v !== null) {
          const f = findDate(v, field);
          if (f) return f;
        }
      }
      return null;
    };

    const pickup = findDate(data, 'pickup');
    const arrival = findDate(data, 'arrivalToOspReceiver');
    if (pickup && arrival) {
      const diff =
        new Date(arrival).getTime() - new Date(pickup).getTime();
      deliveryDays = Math.max(1, Math.ceil(diff / 86_400_000));
    }

    const timing = endTiming();
    return NextResponse.json({
      company: 'Деловые Линии',
      price: Math.round(totalPrice),
      days: deliveryDays || 0,
      details: data.data || {},
      requestData,
      responseData: data,
      apiUrl,
      sessionId: sessionID,
      timing,
    });
  } catch (error: any) {
    endTiming();
    return NextResponse.json({
      company: 'Деловые Линии',
      price: 0,
      days: 0,
      error: `Ошибка соединения: ${error.message}`,
      apiUrl: 'https://api.dellin.ru/v2/calculator.json',
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

