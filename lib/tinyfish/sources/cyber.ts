/**
 * Cyber vulnerability scan agent definitions.
 *
 * Ports the top-10 OWASP agents from scan_top10.py into the Fathom
 * TinyFish source format. Each agent has a recon phase and attack
 * goals with optional learning-loop iterations.
 */

export interface CyberAgent {
  id: string;
  name: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium';
  phase: 'recon' | 'attack';
  iterations: number;
  goals: string[];
}

const STAY_ON_TARGET =
  '\n\nIMPORTANT: ONLY interact with the target URL provided. ' +
  'Do NOT navigate to any other domain or search for alternative instances. ' +
  'If the site is slow, wait and retry on the SAME URL. ' +
  'Never leave the target domain.';

function buildGoal(template: string, target: string, reconData?: string, prevResult?: string): string {
  return template
    .replaceAll('{target}', target)
    .replaceAll('{recon_data}', reconData ?? 'No recon data available.')
    .replaceAll('{prev_result}', prevResult ?? 'No previous result.')
    + STAY_ON_TARGET;
}

export { buildGoal };

export const RECON_AGENT: CyberAgent = {
  id: 'recon-api',
  name: 'Recon — API & Auth Surface Mapping',
  category: 'Reconnaissance',
  severity: 'High',
  phase: 'recon',
  iterations: 1,
  goals: [
    'Thoroughly map the API surface and auth mechanisms of {target}:\n'
    + '1. Browse the site with dev tools Network tab open — log every XHR/fetch request.\n'
    + '2. Check /api-docs/, /swagger.json, /swagger-ui/, /openapi.json, /graphql.\n'
    + '3. Try common REST patterns: /api/Users, /api/Products, /api/Orders, '
    + '/rest/user/whoami, /rest/admin/application-version.\n'
    + '4. Register an account (recon_test@test.com / ReconTest1! / answer: test) '
    + 'and log in. Extract JWT token from localStorage/cookies. Decode it.\n'
    + '5. Note which endpoints need auth and which are public.\n'
    + '6. Check response headers on main page for tech stack info.\n\n'
    + 'Return as JSON: {"endpoints": [...], "auth_mechanism": str, "tech_stack": str, '
    + '"public_endpoints": [...], "auth_required": [...]}',
  ],
};

export const ATTACK_AGENTS: CyberAgent[] = [
  {
    id: 'idor-api',
    name: 'IDOR — API Resource Access',
    category: 'A01-BrokenAccessControl',
    severity: 'Critical',
    phase: 'attack',
    iterations: 2,
    goals: [
      'Using the recon data below, test for IDOR on {target}.\n'
      + '{recon_data}\n\n'
      + 'Register a new account (idor_test@test.com / TestTest1! / answer: test) and log in.\n'
      + 'For EVERY API endpoint found in recon that takes an ID parameter:\n'
      + '1. Access your own resource first (note your user ID from JWT or API)\n'
      + '2. Change the ID to 1, 2, 3 and see if you get other users\' data\n'
      + '3. Try: /api/Users/1, /api/Users/2, /rest/basket/1, /rest/basket/2\n'
      + '4. Check if responses differ or if access is denied\n'
      + 'Return JSON: {"vulnerable": bool, "endpoints_tested": [...], "findings": [...]}',
      'Previous IDOR results:\n{prev_result}\n\n'
      + 'Now test VERTICAL access control on {target}:\n'
      + '1. Using your normal user account, try accessing admin endpoints:\n'
      + '   - /administration, /api/Users (list all), /api/Feedbacks (delete)\n'
      + '2. Try HTTP method tampering: if GET is blocked, try PUT, DELETE, PATCH\n'
      + '3. Try accessing /rest/admin/* endpoints with your normal user token\n'
      + 'Return JSON: {"privilege_escalation": bool, "findings": [...]}',
    ],
  },
  {
    id: 'jwt-security',
    name: 'JWT & Session Token Analysis',
    category: 'A07-AuthFailures',
    severity: 'Critical',
    phase: 'attack',
    iterations: 2,
    goals: [
      'Using the recon data below, analyse token security on {target}.\n'
      + '{recon_data}\n\n'
      + '1. Register and log in (jwt_test@test.com / TestTest1! / answer: test)\n'
      + '2. Extract the JWT from localStorage or cookies. Copy the FULL token.\n'
      + '3. Decode all 3 parts (header.payload.signature — each is base64).\n'
      + '4. Report: algorithm (alg), expiration (exp), user data in payload.\n'
      + '5. Check: does the token have an expiry? Is it reasonable?\n'
      + '6. Log out — can you still use the old token?\n'
      + 'Return JSON: {"algorithm": str, "has_expiry": bool, "sensitive_data": [...], "findings": [...]}',
      'Previous JWT results:\n{prev_result}\n\n'
      + 'Now try JWT attacks on {target}:\n'
      + '1. Try algorithm confusion: change alg to "none" and remove signature.\n'
      + '2. Try changing payload: set role to admin, isAdmin to true.\n'
      + '3. Send the modified token to a protected endpoint.\n'
      + 'Return JSON: {"attacks_succeeded": [...], "attacks_failed": [...]}',
    ],
  },
  {
    id: 'ssrf',
    name: 'SSRF — Server-Side Request Forgery',
    category: 'A10-SSRF',
    severity: 'Critical',
    phase: 'attack',
    iterations: 1,
    goals: [
      'Using the recon data below, find SSRF vectors on {target}.\n'
      + '{recon_data}\n\n'
      + 'Look for ANY functionality that accepts a URL as input:\n'
      + '- Profile image URL, webhook URLs, import from URL, link preview\n'
      + 'For each URL input found, try:\n'
      + '1. http://localhost:3000/api/Users (loopback)\n'
      + '2. http://169.254.169.254/latest/meta-data/ (AWS metadata)\n'
      + 'Return JSON: {"url_inputs_found": [...], "ssrf_vulnerable": bool, "findings": [...]}',
    ],
  },
  {
    id: 'mass-assignment',
    name: 'Mass Assignment & Parameter Pollution',
    category: 'API-BOLA',
    severity: 'Critical',
    phase: 'attack',
    iterations: 1,
    goals: [
      'Using the recon data below, test mass assignment on {target}.\n'
      + '{recon_data}\n\n'
      + 'Register (mass_test@test.com / TestTest1! / answer: test) and log in.\n'
      + '1. Find your user ID from the JWT or /rest/user/whoami.\n'
      + '2. Send PUT to /api/Users/[your-id] with extra fields: "role":"admin", "isAdmin":true\n'
      + '3. Check registration: POST /api/Users with "role":"admin" in the body\n'
      + '4. For basket APIs: try adding price=0, quantity=-1\n'
      + 'Return JSON: {"vulnerable": bool, "accepted_fields": [...], "findings": [...]}',
    ],
  },
  {
    id: 'security-headers',
    name: 'Security Headers & CSP Audit',
    category: 'A05-SecurityMisconfig',
    severity: 'High',
    phase: 'attack',
    iterations: 1,
    goals: [
      'Go to {target} and inspect response headers on the main page.\n'
      + 'Check for presence/absence of:\n'
      + '- Content-Security-Policy\n- X-Frame-Options\n- X-Content-Type-Options\n'
      + '- Strict-Transport-Security\n- Referrer-Policy\n- Permissions-Policy\n'
      + '- Cross-Origin-Opener-Policy\n- Cross-Origin-Resource-Policy\n'
      + 'Also flag: X-Powered-By, Server version headers.\n'
      + 'Return JSON: {"headers": {"header_name": "value_or_MISSING"}, "pass": [...], "fail": [...]}',
    ],
  },
  {
    id: 'api-auth-abuse',
    name: 'API Rate Limiting & User Enumeration',
    category: 'API-Security',
    severity: 'High',
    phase: 'attack',
    iterations: 1,
    goals: [
      'Test API authentication abuse on {target}:\n'
      + '1. USER ENUMERATION: Try logging in with known vs fake emails and wrong passwords.\n'
      + '   Do the error messages or response times differ?\n'
      + '2. RATE LIMITING: Submit the login form 10 times rapidly with wrong credentials.\n'
      + '   Is there any lockout, CAPTCHA, or rate limit?\n'
      + '3. Check if /api/Users endpoint lists all users without auth.\n'
      + 'Return JSON: {"enumeration_possible": bool, "rate_limited": bool, "findings": [...]}',
    ],
  },
  {
    id: 'file-upload',
    name: 'File Upload & XXE Exploitation',
    category: 'A03-Injection',
    severity: 'High',
    phase: 'attack',
    iterations: 2,
    goals: [
      'Using the recon data below, find file upload on {target}.\n'
      + '{recon_data}\n\n'
      + 'Look for: complaint forms, profile photo upload, document upload.\n'
      + 'For each upload form:\n'
      + '1. Check client-side file type restrictions\n'
      + '2. Try uploading: .txt, .xml, .html, .svg, .php\n'
      + '3. Note which are accepted/rejected\n'
      + 'Return JSON: {"upload_forms": [...], "accepted_types": [...], "findings": [...]}',
      'Previous upload results:\n{prev_result}\n\n'
      + 'Now try XXE and advanced upload attacks on {target}:\n'
      + 'If XML uploads are accepted, try XXE payload:\n'
      + '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>\n'
      + 'Also try SVG with embedded JS, double extensions, path traversal in filename.\n'
      + 'Return JSON: {"xxe_vulnerable": bool, "bypasses": [...], "data_extracted": str}',
    ],
  },
  {
    id: 'input-boundary',
    name: 'Business Logic & Input Boundary Abuse',
    category: 'A04-InsecureDesign',
    severity: 'High',
    phase: 'attack',
    iterations: 2,
    goals: [
      'Using the recon data below, test business logic flaws on {target}.\n'
      + '{recon_data}\n\n'
      + '1. Add a product to cart. Try changing quantity to: 0, -1, -100, 999999\n'
      + '2. Try modifying the price in the request body.\n'
      + '3. Check if CAPTCHA answer is exposed in page source/DOM.\n'
      + 'Return JSON: {"boundary_violations": [...], "findings": [...]}',
      'Previous boundary results:\n{prev_result}\n\n'
      + 'Now test more logic flaws on {target}:\n'
      + '1. Try checking out with negative-quantity items\n'
      + '2. Try modifying order total in the checkout API request\n'
      + '3. Try using API to add items to another user\'s basket\n'
      + 'Return JSON: {"logic_bypasses": [...], "findings": [...]}',
    ],
  },
  {
    id: 'outdated-components',
    name: 'Outdated Components & Supply Chain Risk',
    category: 'A06-VulnerableComponents',
    severity: 'High',
    phase: 'attack',
    iterations: 1,
    goals: [
      'Detect all client-side libraries and versions on {target}:\n'
      + '1. Open dev tools > Sources tab. List all loaded JS files.\n'
      + '2. Try JS console commands: angular.version, jQuery.fn.jquery, React.version\n'
      + '3. Check page source for CDN URLs with version numbers.\n'
      + '4. Check /rest/admin/application-version for app version.\n'
      + '5. Flag any with known CVEs (Angular < 1.6, jQuery < 3.5, lodash < 4.17.21)\n'
      + 'Return JSON: {"libraries": [{"name": str, "version": str, "known_cves": [...]}], "findings": [...]}',
    ],
  },
  {
    id: 'open-redirect',
    name: 'Open Redirect & URL Validation',
    category: 'A01-BrokenAccessControl',
    severity: 'Medium',
    phase: 'attack',
    iterations: 1,
    goals: [
      'Test for open redirect vulnerabilities on {target}:\n'
      + '1. Look for redirect parameters in URLs: redirect, url, next, return, goto, to\n'
      + '2. Try: {target}/redirect?to=https://evil.com\n'
      + '3. Try bypass techniques: //evil.com, https://evil.com@{target}\n'
      + '4. Check OAuth/login flows for redirect_uri manipulation\n'
      + 'Return JSON: {"redirect_params_found": [...], "vulnerable": bool, "bypasses": [...]}',
    ],
  },
];

export const ALL_CYBER_AGENTS: CyberAgent[] = [RECON_AGENT, ...ATTACK_AGENTS];
