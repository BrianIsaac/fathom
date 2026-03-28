/**
 * Tier 0 and Tier 1 cyber vulnerability checks using plain HTTP.
 *
 * These replace TinyFish browser agents for checks that don't need
 * a real browser — cutting cost to $0 and latency to <10s.
 */

export interface CyberFinding {
  id: string;
  name: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium';
  status: 'VULNERABLE' | 'NOT_VULNERABLE' | 'INCONCLUSIVE' | 'ERROR';
  duration_ms: number;
  summary: string;
  evidence: string | null;
}

// ─── TIER 0: No auth needed, pure HTTP ──────────────────────

/**
 * Checks security response headers against best-practice checklist.
 */
export async function checkSecurityHeaders(target: string): Promise<CyberFinding> {
  const start = Date.now();
  try {
    const res = await fetch(target, { method: 'GET', redirect: 'follow' });
    const headers = Object.fromEntries(res.headers.entries());

    const required: Record<string, string> = {
      'content-security-policy': 'Content-Security-Policy',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'strict-transport-security': 'Strict-Transport-Security',
      'referrer-policy': 'Referrer-Policy',
      'permissions-policy': 'Permissions-Policy',
    };

    const missing: string[] = [];
    const present: string[] = [];
    for (const [header, label] of Object.entries(required)) {
      if (headers[header]) {
        present.push(`${label}: ${headers[header]}`);
      } else {
        missing.push(label);
      }
    }

    const leaks: string[] = [];
    if (headers['x-powered-by']) leaks.push(`X-Powered-By: ${headers['x-powered-by']}`);
    if (headers['server']) leaks.push(`Server: ${headers['server']}`);

    const vulnerable = missing.length > 2 || leaks.length > 0;

    return {
      id: 'security-headers',
      name: 'Security Headers & CSP Audit',
      category: 'A05-SecurityMisconfig',
      severity: 'High',
      status: vulnerable ? 'VULNERABLE' : 'NOT_VULNERABLE',
      duration_ms: Date.now() - start,
      summary: vulnerable
        ? `Missing: ${missing.join(', ')}. ${leaks.length > 0 ? `Info leaks: ${leaks.join(', ')}` : ''}`
        : `All ${present.length} security headers present.`,
      evidence: JSON.stringify({ missing, present, leaks }),
    };
  } catch (err) {
    return {
      id: 'security-headers',
      name: 'Security Headers & CSP Audit',
      category: 'A05-SecurityMisconfig',
      severity: 'High',
      status: 'ERROR',
      duration_ms: Date.now() - start,
      summary: `Failed to fetch: ${String(err)}`,
      evidence: null,
    };
  }
}

/**
 * Tests for open redirect by probing common redirect parameters.
 */
export async function checkOpenRedirect(target: string): Promise<CyberFinding> {
  const start = Date.now();
  const params = ['redirect', 'url', 'next', 'return', 'goto', 'to'];
  const evilDomain = 'https://evil.example.com';
  const findings: string[] = [];

  try {
    for (const param of params) {
      const testUrl = `${target}/${param}?${param}=${encodeURIComponent(evilDomain)}`;
      try {
        const res = await fetch(testUrl, { redirect: 'manual' });
        const location = res.headers.get('location') ?? '';
        if (location.includes('evil.example.com')) {
          findings.push(`${param} parameter redirects to external domain`);
        }
      } catch {
        // Connection error on this param — skip
      }
    }

    // Also try common redirect paths
    for (const path of ['/redirect', '/login', '/oauth/callback']) {
      try {
        const res = await fetch(`${target}${path}?to=${encodeURIComponent(evilDomain)}`, { redirect: 'manual' });
        const location = res.headers.get('location') ?? '';
        if (location.includes('evil.example.com')) {
          findings.push(`${path}?to= redirects to external domain`);
        }
      } catch {
        // Skip
      }
    }

    return {
      id: 'open-redirect',
      name: 'Open Redirect & URL Validation',
      category: 'A01-BrokenAccessControl',
      severity: 'Medium',
      status: findings.length > 0 ? 'VULNERABLE' : 'NOT_VULNERABLE',
      duration_ms: Date.now() - start,
      summary: findings.length > 0
        ? `Open redirects found: ${findings.join('; ')}`
        : 'No open redirect vectors found in common parameters.',
      evidence: findings.length > 0 ? JSON.stringify(findings) : null,
    };
  } catch (err) {
    return {
      id: 'open-redirect',
      name: 'Open Redirect & URL Validation',
      category: 'A01-BrokenAccessControl',
      severity: 'Medium',
      status: 'ERROR',
      duration_ms: Date.now() - start,
      summary: `Failed: ${String(err)}`,
      evidence: null,
    };
  }
}

/**
 * Detects outdated libraries by scanning HTML source for version strings in CDN URLs.
 */
export async function checkOutdatedComponents(target: string): Promise<CyberFinding> {
  const start = Date.now();
  try {
    const res = await fetch(target);
    const html = await res.text();

    const versionPatterns: Array<{ name: string; pattern: RegExp; minSafe: string }> = [
      { name: 'Angular 1.x', pattern: /angular[.\-/](\d+\.\d+\.\d+)/i, minSafe: '1.8.0' },
      { name: 'jQuery', pattern: /jquery[.\-/](\d+\.\d+\.\d+)/i, minSafe: '3.5.0' },
      { name: 'lodash', pattern: /lodash[.\-/](\d+\.\d+\.\d+)/i, minSafe: '4.17.21' },
      { name: 'React', pattern: /react[.\-/](\d+\.\d+\.\d+)/i, minSafe: '18.0.0' },
      { name: 'Bootstrap', pattern: /bootstrap[.\-/](\d+\.\d+\.\d+)/i, minSafe: '5.0.0' },
      { name: 'Vue', pattern: /vue[.\-/](\d+\.\d+\.\d+)/i, minSafe: '3.0.0' },
    ];

    const detected: Array<{ name: string; version: string; outdated: boolean }> = [];
    for (const { name, pattern, minSafe } of versionPatterns) {
      const match = html.match(pattern);
      if (match) {
        const version = match[1];
        const outdated = version < minSafe;
        detected.push({ name, version, outdated });
      }
    }

    // Also check for version endpoint
    let appVersion: string | null = null;
    try {
      const vRes = await fetch(`${target}/rest/admin/application-version`);
      if (vRes.ok) {
        const data = await vRes.json();
        appVersion = data.version ?? null;
      }
    } catch {
      // No version endpoint
    }

    const outdated = detected.filter(d => d.outdated);

    return {
      id: 'outdated-components',
      name: 'Outdated Components & Supply Chain Risk',
      category: 'A06-VulnerableComponents',
      severity: 'High',
      status: outdated.length > 0 ? 'VULNERABLE' : detected.length > 0 ? 'NOT_VULNERABLE' : 'INCONCLUSIVE',
      duration_ms: Date.now() - start,
      summary: outdated.length > 0
        ? `Outdated: ${outdated.map(d => `${d.name} ${d.version}`).join(', ')}${appVersion ? `. App version: ${appVersion}` : ''}`
        : `${detected.length} libraries detected, all current.${appVersion ? ` App version: ${appVersion}` : ''}`,
      evidence: JSON.stringify({ detected, appVersion }),
    };
  } catch (err) {
    return {
      id: 'outdated-components',
      name: 'Outdated Components & Supply Chain Risk',
      category: 'A06-VulnerableComponents',
      severity: 'High',
      status: 'ERROR',
      duration_ms: Date.now() - start,
      summary: `Failed: ${String(err)}`,
      evidence: null,
    };
  }
}

/**
 * Probes common API endpoints without authentication to detect exposed data.
 */
export async function checkUnauthenticatedAPIs(target: string): Promise<CyberFinding> {
  const start = Date.now();
  const endpoints = [
    '/api/Users', '/api/Products', '/api/Orders', '/api/Cards',
    '/api/Feedbacks', '/api/SecurityQuestions',
    '/rest/admin/application-version', '/rest/user/whoami',
    '/api-docs', '/swagger.json', '/openapi.json', '/graphql',
  ];

  const exposed: string[] = [];
  const blocked: string[] = [];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${target}${ep}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 2 && !text.includes('<!DOCTYPE')) {
          exposed.push(`${ep} (${res.status}, ${text.length} bytes)`);
        }
      } else {
        blocked.push(ep);
      }
    } catch {
      // Unreachable
    }
  }

  return {
    id: 'api-exposure',
    name: 'Unauthenticated API Exposure',
    category: 'A01-BrokenAccessControl',
    severity: 'Critical',
    status: exposed.length > 3 ? 'VULNERABLE' : exposed.length > 0 ? 'INCONCLUSIVE' : 'NOT_VULNERABLE',
    duration_ms: Date.now() - start,
    summary: exposed.length > 0
      ? `${exposed.length} endpoints return data without auth: ${exposed.slice(0, 5).join(', ')}`
      : 'No unauthenticated API endpoints found.',
    evidence: JSON.stringify({ exposed, blocked }),
  };
}

// ─── TIER 1: Requires login token, still plain HTTP ─────────

/**
 * Attempts to register + login via common API patterns and returns a bearer token.
 * Returns null if no JSON auth endpoint is found.
 */
export async function obtainAuthToken(target: string): Promise<{ token: string; userId: string | null } | null> {
  const email = `fathom_scan_${Date.now()}@test.com`;
  const password = 'FathomScan1!';

  // Try registration
  const regEndpoints = ['/api/Users', '/api/register', '/rest/user/register'];
  for (const ep of regEndpoints) {
    try {
      const res = await fetch(`${target}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, passwordRepeat: password, securityQuestion: { id: 1, question: 'test' }, securityAnswer: 'test' }),
      });
      if (res.ok) break;
    } catch {
      // Try next
    }
  }

  // Try login
  const loginEndpoints = ['/rest/user/login', '/api/login', '/api/auth/login'];
  for (const ep of loginEndpoints) {
    try {
      const res = await fetch(`${target}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.authentication?.token ?? data.token ?? data.access_token ?? null;
        if (token) {
          // Decode JWT payload for user ID
          let userId: string | null = null;
          try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = String(payload.data?.id ?? payload.sub ?? payload.id ?? '');
          } catch {
            // Not a valid JWT
          }
          return { token, userId };
        }
      }
    } catch {
      // Try next
    }
  }

  return null;
}

/**
 * Tests for IDOR by accessing other users' resources with a valid token.
 */
export async function checkIDOR(target: string, token: string, userId: string | null): Promise<CyberFinding> {
  const start = Date.now();
  const findings: string[] = [];
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const idEndpoints = ['/api/Users/', '/rest/basket/', '/api/Cards/', '/api/Orders/'];
  const testIds = ['1', '2', '3'];

  for (const ep of idEndpoints) {
    for (const id of testIds) {
      if (userId && id === userId) continue;
      try {
        const res = await fetch(`${target}${ep}${id}`, { headers });
        if (res.ok) {
          const text = await res.text();
          if (text.length > 10 && !text.includes('error')) {
            findings.push(`${ep}${id} accessible (${text.length} bytes)`);
          }
        }
      } catch {
        // Skip
      }
    }
  }

  return {
    id: 'idor-api',
    name: 'IDOR — API Resource Access',
    category: 'A01-BrokenAccessControl',
    severity: 'Critical',
    status: findings.length > 0 ? 'VULNERABLE' : 'NOT_VULNERABLE',
    duration_ms: Date.now() - start,
    summary: findings.length > 0
      ? `IDOR found: ${findings.slice(0, 5).join('; ')}`
      : 'No IDOR vulnerabilities detected.',
    evidence: findings.length > 0 ? JSON.stringify(findings) : null,
  };
}

/**
 * Analyses JWT token for security issues (weak algorithm, no expiry, sensitive data).
 */
export async function checkJWTSecurity(token: string): Promise<CyberFinding> {
  const start = Date.now();
  const findings: string[] = [];

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        id: 'jwt-security', name: 'JWT & Session Token Analysis',
        category: 'A07-AuthFailures', severity: 'Critical',
        status: 'INCONCLUSIVE', duration_ms: Date.now() - start,
        summary: 'Token is not a standard JWT (expected 3 parts).', evidence: null,
      };
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    if (header.alg === 'none' || header.alg === 'None') findings.push('Algorithm set to "none" — signature not verified');
    if (header.alg === 'HS256') findings.push('Uses HS256 — vulnerable to brute-force if secret is weak');
    if (!payload.exp) findings.push('No expiration claim (exp) — token never expires');
    if (payload.exp && payload.exp - payload.iat > 86400 * 7) findings.push('Token lifetime exceeds 7 days');
    if (payload.password || payload.passwordHash) findings.push('Password data in token payload');
    if (payload.isAdmin !== undefined || payload.role) findings.push(`Role/admin data exposed in payload: role=${payload.role ?? ''}, isAdmin=${payload.isAdmin ?? ''}`);

    return {
      id: 'jwt-security',
      name: 'JWT & Session Token Analysis',
      category: 'A07-AuthFailures',
      severity: 'Critical',
      status: findings.length > 0 ? 'VULNERABLE' : 'NOT_VULNERABLE',
      duration_ms: Date.now() - start,
      summary: findings.length > 0
        ? findings.join('. ')
        : 'JWT uses secure algorithm with proper expiration.',
      evidence: JSON.stringify({ algorithm: header.alg, hasExpiry: !!payload.exp, payloadKeys: Object.keys(payload) }),
    };
  } catch (err) {
    return {
      id: 'jwt-security', name: 'JWT & Session Token Analysis',
      category: 'A07-AuthFailures', severity: 'Critical',
      status: 'ERROR', duration_ms: Date.now() - start,
      summary: `Failed to decode JWT: ${String(err)}`, evidence: null,
    };
  }
}

/**
 * Tests mass assignment by sending extra fields in PUT/POST requests.
 */
export async function checkMassAssignment(target: string, token: string, userId: string | null): Promise<CyberFinding> {
  const start = Date.now();
  const findings: string[] = [];
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  if (userId) {
    try {
      const res = await fetch(`${target}/api/Users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: 'admin', isAdmin: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.role === 'admin' || data.isAdmin === true) {
          findings.push('PUT /api/Users/{id} accepted role/isAdmin fields — privilege escalation possible');
        }
      }
    } catch {
      // Endpoint not available
    }
  }

  // Try registration with extra fields
  try {
    const res = await fetch(`${target}/api/Users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `mass_test_${Date.now()}@test.com`,
        password: 'MassTest1!',
        passwordRepeat: 'MassTest1!',
        role: 'admin',
        isAdmin: true,
        securityQuestion: { id: 1, question: 'test' },
        securityAnswer: 'test',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.role === 'admin' || data.isAdmin === true) {
        findings.push('Registration accepted role/isAdmin fields');
      }
    }
  } catch {
    // Skip
  }

  return {
    id: 'mass-assignment',
    name: 'Mass Assignment & Parameter Pollution',
    category: 'API-BOLA',
    severity: 'Critical',
    status: findings.length > 0 ? 'VULNERABLE' : 'NOT_VULNERABLE',
    duration_ms: Date.now() - start,
    summary: findings.length > 0
      ? findings.join('. ')
      : 'No mass assignment vulnerabilities detected.',
    evidence: findings.length > 0 ? JSON.stringify(findings) : null,
  };
}

/**
 * Tests for rate limiting and user enumeration on login endpoints.
 */
export async function checkRateLimitingAndEnumeration(target: string): Promise<CyberFinding> {
  const start = Date.now();
  const findings: string[] = [];
  const loginEndpoints = ['/rest/user/login', '/api/login', '/api/auth/login'];

  for (const ep of loginEndpoints) {
    try {
      // Test enumeration — compare responses for valid vs invalid emails
      const validRes = await fetch(`${target}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@juice-sh.op', password: 'wrong' }),
      });
      const invalidRes = await fetch(`${target}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent_xyz@nowhere.com', password: 'wrong' }),
      });

      const validBody = await validRes.text();
      const invalidBody = await invalidRes.text();
      if (validBody !== invalidBody) {
        findings.push(`${ep}: different responses for valid vs invalid emails — user enumeration possible`);
      }

      // Test rate limiting — 10 rapid requests
      let blocked = false;
      for (let i = 0; i < 10; i++) {
        const res = await fetch(`${target}${ep}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ratetest@test.com', password: 'wrong' }),
        });
        if (res.status === 429) { blocked = true; break; }
      }
      if (!blocked) findings.push(`${ep}: no rate limiting after 10 failed attempts`);

      if (validRes.ok || invalidRes.ok) break;
    } catch {
      continue;
    }
  }

  return {
    id: 'api-auth-abuse',
    name: 'API Rate Limiting & User Enumeration',
    category: 'API-Security',
    severity: 'High',
    status: findings.length > 0 ? 'VULNERABLE' : 'NOT_VULNERABLE',
    duration_ms: Date.now() - start,
    summary: findings.length > 0
      ? findings.join('. ')
      : 'Login endpoints have proper rate limiting and consistent error responses.',
    evidence: findings.length > 0 ? JSON.stringify(findings) : null,
  };
}

/**
 * Runs all Tier 0 checks (no auth, pure HTTP).
 */
export async function runTier0(target: string): Promise<CyberFinding[]> {
  const results = await Promise.allSettled([
    checkSecurityHeaders(target),
    checkOpenRedirect(target),
    checkOutdatedComponents(target),
    checkUnauthenticatedAPIs(target),
    checkRateLimitingAndEnumeration(target),
  ]);

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const ids = ['security-headers', 'open-redirect', 'outdated-components', 'api-exposure', 'api-auth-abuse'];
    return {
      id: ids[i], name: ids[i], category: 'Error', severity: 'High' as const,
      status: 'ERROR' as const, duration_ms: 0,
      summary: `Check failed: ${r.reason}`, evidence: null,
    };
  });
}

/**
 * Runs all Tier 1 checks (requires auth token, still plain HTTP).
 */
export async function runTier1(target: string, token: string, userId: string | null): Promise<CyberFinding[]> {
  const results = await Promise.allSettled([
    checkIDOR(target, token, userId),
    checkJWTSecurity(token),
    checkMassAssignment(target, token, userId),
  ]);

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const ids = ['idor-api', 'jwt-security', 'mass-assignment'];
    return {
      id: ids[i], name: ids[i], category: 'Error', severity: 'Critical' as const,
      status: 'ERROR' as const, duration_ms: 0,
      summary: `Check failed: ${r.reason}`, evidence: null,
    };
  });
}
