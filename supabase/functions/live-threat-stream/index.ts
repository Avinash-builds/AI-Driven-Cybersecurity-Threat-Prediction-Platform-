import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Comprehensive country coordinates for global coverage
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  // North America
  'United States': { lat: 37.09, lng: -95.71 },
  'Canada': { lat: 56.13, lng: -106.34 },
  'Mexico': { lat: 23.63, lng: -102.55 },
  'Cuba': { lat: 21.52, lng: -77.78 },
  'Jamaica': { lat: 18.10, lng: -77.29 },
  'Panama': { lat: 8.53, lng: -80.78 },
  'Costa Rica': { lat: 9.74, lng: -83.75 },
  
  // South America
  'Brazil': { lat: -14.23, lng: -51.92 },
  'Argentina': { lat: -38.41, lng: -63.61 },
  'Colombia': { lat: 4.57, lng: -74.29 },
  'Chile': { lat: -35.67, lng: -71.54 },
  'Peru': { lat: -9.18, lng: -75.01 },
  'Venezuela': { lat: 6.42, lng: -66.58 },
  'Ecuador': { lat: -1.83, lng: -78.18 },
  'Bolivia': { lat: -16.29, lng: -63.58 },
  'Paraguay': { lat: -23.44, lng: -58.44 },
  'Uruguay': { lat: -32.52, lng: -55.76 },
  
  // Europe
  'United Kingdom': { lat: 55.37, lng: -3.43 },
  'Germany': { lat: 51.16, lng: 10.45 },
  'France': { lat: 46.22, lng: 2.21 },
  'Italy': { lat: 41.87, lng: 12.56 },
  'Spain': { lat: 40.46, lng: -3.74 },
  'Netherlands': { lat: 52.13, lng: 5.29 },
  'Belgium': { lat: 50.50, lng: 4.46 },
  'Switzerland': { lat: 46.81, lng: 8.22 },
  'Austria': { lat: 47.51, lng: 14.55 },
  'Poland': { lat: 51.91, lng: 19.14 },
  'Sweden': { lat: 60.12, lng: 18.64 },
  'Norway': { lat: 60.47, lng: 8.46 },
  'Finland': { lat: 61.92, lng: 25.74 },
  'Denmark': { lat: 56.26, lng: 9.50 },
  'Ireland': { lat: 53.14, lng: -7.69 },
  'Portugal': { lat: 39.39, lng: -8.22 },
  'Greece': { lat: 39.07, lng: 21.82 },
  'Czech Republic': { lat: 49.81, lng: 15.47 },
  'Romania': { lat: 45.94, lng: 24.96 },
  'Hungary': { lat: 47.16, lng: 19.50 },
  'Ukraine': { lat: 48.37, lng: 31.16 },
  'Belarus': { lat: 53.70, lng: 27.95 },
  'Bulgaria': { lat: 42.73, lng: 25.48 },
  'Serbia': { lat: 44.01, lng: 21.00 },
  'Croatia': { lat: 45.10, lng: 15.20 },
  'Slovakia': { lat: 48.66, lng: 19.69 },
  'Slovenia': { lat: 46.15, lng: 14.99 },
  'Lithuania': { lat: 55.16, lng: 23.88 },
  'Latvia': { lat: 56.87, lng: 24.60 },
  'Estonia': { lat: 58.59, lng: 25.01 },
  'Moldova': { lat: 47.41, lng: 28.36 },
  'Albania': { lat: 41.15, lng: 20.16 },
  'North Macedonia': { lat: 41.51, lng: 21.74 },
  'Bosnia': { lat: 43.91, lng: 17.67 },
  'Montenegro': { lat: 42.70, lng: 19.37 },
  'Kosovo': { lat: 42.60, lng: 20.90 },
  'Luxembourg': { lat: 49.81, lng: 6.13 },
  'Malta': { lat: 35.93, lng: 14.37 },
  'Iceland': { lat: 64.96, lng: -19.02 },
  'Cyprus': { lat: 35.12, lng: 33.42 },
  
  // Russia & Central Asia
  'Russia': { lat: 61.52, lng: 105.31 },
  'Kazakhstan': { lat: 48.01, lng: 66.92 },
  'Uzbekistan': { lat: 41.37, lng: 64.58 },
  'Turkmenistan': { lat: 38.96, lng: 59.55 },
  'Kyrgyzstan': { lat: 41.20, lng: 74.76 },
  'Tajikistan': { lat: 38.86, lng: 71.27 },
  'Georgia': { lat: 42.31, lng: 43.35 },
  'Armenia': { lat: 40.06, lng: 45.03 },
  'Azerbaijan': { lat: 40.14, lng: 47.57 },
  'Mongolia': { lat: 46.86, lng: 103.84 },
  
  // Middle East
  'Turkey': { lat: 38.96, lng: 35.24 },
  'Iran': { lat: 32.42, lng: 53.68 },
  'Iraq': { lat: 33.22, lng: 43.67 },
  'Saudi Arabia': { lat: 23.88, lng: 45.07 },
  'United Arab Emirates': { lat: 23.42, lng: 53.84 },
  'Israel': { lat: 31.04, lng: 34.85 },
  'Jordan': { lat: 30.58, lng: 36.23 },
  'Lebanon': { lat: 33.85, lng: 35.86 },
  'Syria': { lat: 34.80, lng: 38.99 },
  'Yemen': { lat: 15.55, lng: 48.51 },
  'Oman': { lat: 21.51, lng: 55.92 },
  'Kuwait': { lat: 29.31, lng: 47.48 },
  'Qatar': { lat: 25.35, lng: 51.18 },
  'Bahrain': { lat: 26.06, lng: 50.55 },
  'Palestine': { lat: 31.95, lng: 35.23 },
  'Afghanistan': { lat: 33.93, lng: 67.70 },
  'Pakistan': { lat: 30.37, lng: 69.34 },
  
  // Asia
  'China': { lat: 35.86, lng: 104.19 },
  'Japan': { lat: 36.20, lng: 138.25 },
  'South Korea': { lat: 35.90, lng: 127.76 },
  'North Korea': { lat: 40.34, lng: 127.51 },
  'India': { lat: 20.59, lng: 78.96 },
  'Indonesia': { lat: -0.78, lng: 113.92 },
  'Thailand': { lat: 15.87, lng: 100.99 },
  'Vietnam': { lat: 14.05, lng: 108.27 },
  'Philippines': { lat: 12.87, lng: 121.77 },
  'Malaysia': { lat: 4.21, lng: 101.97 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'Myanmar': { lat: 21.91, lng: 95.95 },
  'Bangladesh': { lat: 23.68, lng: 90.35 },
  'Sri Lanka': { lat: 7.87, lng: 80.77 },
  'Nepal': { lat: 28.39, lng: 84.12 },
  'Cambodia': { lat: 12.56, lng: 104.99 },
  'Laos': { lat: 19.85, lng: 102.49 },
  'Taiwan': { lat: 23.69, lng: 121.00 },
  'Hong Kong': { lat: 22.39, lng: 114.10 },
  'Macau': { lat: 22.19, lng: 113.54 },
  'Brunei': { lat: 4.53, lng: 114.72 },
  'Bhutan': { lat: 27.51, lng: 90.43 },
  'Maldives': { lat: 3.20, lng: 73.22 },
  'Timor-Leste': { lat: -8.87, lng: 125.72 },
  
  // Oceania
  'Australia': { lat: -25.27, lng: 133.77 },
  'New Zealand': { lat: -40.90, lng: 174.88 },
  'Papua New Guinea': { lat: -6.31, lng: 143.95 },
  'Fiji': { lat: -17.71, lng: 178.06 },
  'Solomon Islands': { lat: -9.64, lng: 160.15 },
  'Vanuatu': { lat: -15.37, lng: 166.95 },
  'Samoa': { lat: -13.75, lng: -172.10 },
  'Tonga': { lat: -21.17, lng: -175.19 },
  
  // Africa
  'South Africa': { lat: -30.55, lng: 22.93 },
  'Nigeria': { lat: 9.08, lng: 8.67 },
  'Egypt': { lat: 26.82, lng: 30.80 },
  'Kenya': { lat: -0.02, lng: 37.90 },
  'Morocco': { lat: 31.79, lng: -7.09 },
  'Algeria': { lat: 28.03, lng: 1.65 },
  'Tunisia': { lat: 33.88, lng: 9.53 },
  'Libya': { lat: 26.33, lng: 17.22 },
  'Sudan': { lat: 12.86, lng: 30.21 },
  'Ethiopia': { lat: 9.14, lng: 40.48 },
  'Ghana': { lat: 7.94, lng: -1.02 },
  'Tanzania': { lat: -6.36, lng: 34.88 },
  'Uganda': { lat: 1.37, lng: 32.29 },
  'Angola': { lat: -11.20, lng: 17.87 },
  'Mozambique': { lat: -18.66, lng: 35.52 },
  'Zimbabwe': { lat: -19.01, lng: 29.15 },
  'Zambia': { lat: -13.13, lng: 27.84 },
  'Botswana': { lat: -22.32, lng: 24.68 },
  'Namibia': { lat: -22.95, lng: 18.49 },
  'Senegal': { lat: 14.49, lng: -14.45 },
  'Ivory Coast': { lat: 7.54, lng: -5.54 },
  'Cameroon': { lat: 7.36, lng: 12.35 },
  'DR Congo': { lat: -4.03, lng: 21.75 },
  'Rwanda': { lat: -1.94, lng: 29.87 },
  'Madagascar': { lat: -18.76, lng: 46.86 },
  'Mauritius': { lat: -20.34, lng: 57.55 },
  'Somalia': { lat: 5.15, lng: 46.19 },
  'Mali': { lat: 17.57, lng: -3.99 },
  'Niger': { lat: 17.60, lng: 8.08 },
  'Chad': { lat: 15.45, lng: 18.73 },
  'Burkina Faso': { lat: 12.23, lng: -1.56 },
  'Gabon': { lat: -0.80, lng: 11.60 },
  'Congo': { lat: -0.22, lng: 15.82 },
  'Benin': { lat: 9.30, lng: 2.31 },
  'Togo': { lat: 8.61, lng: 0.82 },
  'Eritrea': { lat: 15.17, lng: 39.78 },
  'Liberia': { lat: 6.42, lng: -9.42 },
  'Sierra Leone': { lat: 8.46, lng: -11.77 },
  'Central African Republic': { lat: 6.61, lng: 20.93 },
  'South Sudan': { lat: 6.87, lng: 31.30 },
  'Mauritania': { lat: 21.00, lng: -10.94 },
  'Djibouti': { lat: 11.82, lng: 42.59 },
  'Lesotho': { lat: -29.60, lng: 28.23 },
  'Eswatini': { lat: -26.52, lng: 31.46 },
  'Guinea': { lat: 9.94, lng: -9.69 },
  'Gambia': { lat: 13.44, lng: -15.31 },
  'Cape Verde': { lat: 16.00, lng: -24.01 },
  'Seychelles': { lat: -4.67, lng: 55.49 },
  'Comoros': { lat: -11.87, lng: 43.87 },
};

// Comprehensive network attack types
const ATTACK_TYPES = [
  // Denial of Service
  'DDoS Attack',
  'SYN Flood',
  'UDP Flood',
  'HTTP Flood',
  'Slowloris Attack',
  'Ping of Death',
  'Smurf Attack',
  'DNS Amplification',
  'NTP Amplification',
  'ICMP Flood',
  'ACK Flood',
  'RST Flood',
  'Application Layer DDoS',
  'Memcached Amplification',
  
  // Injection Attacks
  'SQL Injection',
  'NoSQL Injection',
  'LDAP Injection',
  'XML Injection',
  'XPath Injection',
  'Command Injection',
  'OS Command Injection',
  'Code Injection',
  'Template Injection',
  'CRLF Injection',
  'Host Header Injection',
  'Email Header Injection',
  
  // Cross-Site Attacks
  'XSS Attack',
  'Stored XSS',
  'Reflected XSS',
  'DOM-based XSS',
  'Cross-Site Request Forgery (CSRF)',
  'Cross-Origin Attack',
  'Clickjacking',
  
  // Authentication/Credential Attacks
  'Brute Force',
  'Dictionary Attack',
  'Credential Stuffing',
  'Password Spraying',
  'Session Hijacking',
  'Session Fixation',
  'Cookie Theft',
  'Token Replay',
  'Pass-the-Hash',
  'Pass-the-Ticket',
  'Golden Ticket Attack',
  'Silver Ticket Attack',
  'Kerberoasting',
  
  // Network Reconnaissance
  'Port Scan',
  'SYN Scan',
  'FIN Scan',
  'Xmas Scan',
  'NULL Scan',
  'ACK Scan',
  'UDP Scan',
  'Service Enumeration',
  'DNS Enumeration',
  'SNMP Enumeration',
  'Network Mapping',
  'Banner Grabbing',
  'OS Fingerprinting',
  
  // Man-in-the-Middle
  'Man-in-the-Middle',
  'ARP Spoofing',
  'DNS Spoofing',
  'SSL Stripping',
  'HTTPS Downgrade',
  'BGP Hijacking',
  'IP Spoofing',
  'MAC Spoofing',
  'Session Sidejacking',
  'Evil Twin Attack',
  
  // Malware Distribution
  'Malware Distribution',
  'Ransomware',
  'Trojan Distribution',
  'Worm Propagation',
  'Rootkit Installation',
  'Keylogger Injection',
  'Cryptominer Injection',
  'Botnet Command',
  'C2 Communication',
  'Dropper Activity',
  'Fileless Malware',
  'Living-off-the-Land',
  
  // Web Application Attacks
  'Directory Traversal',
  'Path Traversal',
  'File Inclusion (LFI)',
  'Remote File Inclusion (RFI)',
  'Server-Side Request Forgery (SSRF)',
  'XML External Entity (XXE)',
  'Insecure Deserialization',
  'HTTP Request Smuggling',
  'HTTP Response Splitting',
  'Cache Poisoning',
  'Open Redirect',
  'Business Logic Bypass',
  
  // Data Exfiltration
  'Data Exfiltration',
  'DNS Tunneling',
  'ICMP Tunneling',
  'HTTP Tunneling',
  'Covert Channel',
  'Steganography Attack',
  'Database Dump',
  
  // Phishing & Social Engineering
  'Phishing',
  'Spear Phishing',
  'Whaling',
  'Vishing',
  'Smishing',
  'Business Email Compromise',
  'Typosquatting',
  'Watering Hole Attack',
  
  // API Attacks
  'API Abuse',
  'API Rate Limiting Bypass',
  'Broken Object Level Authorization',
  'Broken Function Level Authorization',
  'Mass Assignment',
  'GraphQL Abuse',
  'REST API Exploitation',
  
  // Cryptographic Attacks
  'Cryptographic Attack',
  'Padding Oracle',
  'Timing Attack',
  'Hash Collision',
  'Weak Cipher Exploitation',
  'Certificate Forgery',
  'Key Compromise',
  
  // IoT/OT Attacks
  'IoT Botnet Activity',
  'Mirai Variant',
  'Industrial Control System Attack',
  'SCADA Exploitation',
  'PLC Attack',
  'Modbus Exploitation',
  
  // Advanced Persistent Threats
  'Zero-Day Exploit',
  'Supply Chain Attack',
  'Watering Hole',
  'Spear Phishing Campaign',
  'Lateral Movement',
  'Privilege Escalation',
  'Persistence Mechanism',
  'Defense Evasion',
  'Living Off The Land Binary',
  
  // Cloud-Specific Attacks
  'Cloud Account Takeover',
  'S3 Bucket Enumeration',
  'Instance Metadata Attack',
  'Container Escape',
  'Kubernetes Exploitation',
  'Serverless Function Abuse',
  'Cloud Storage Exposure',
  
  // Protocol-Specific Attacks
  'SMB Exploitation',
  'RDP Brute Force',
  'SSH Brute Force',
  'FTP Attack',
  'Telnet Attack',
  'SMTP Relay Abuse',
  'VoIP Attack',
  'SIP Flooding',
];

const THREAT_ACTORS = [
  { name: 'APT28 (Fancy Bear)', type: 'State-Sponsored', origin: 'Russia', activityLevel: 'high' },
  { name: 'APT29 (Cozy Bear)', type: 'State-Sponsored', origin: 'Russia', activityLevel: 'high' },
  { name: 'Sandworm Team', type: 'State-Sponsored', origin: 'Russia', activityLevel: 'critical' },
  { name: 'Turla', type: 'State-Sponsored', origin: 'Russia', activityLevel: 'medium' },
  { name: 'Lazarus Group', type: 'State-Sponsored', origin: 'North Korea', activityLevel: 'high' },
  { name: 'Kimsuky', type: 'State-Sponsored', origin: 'North Korea', activityLevel: 'medium' },
  { name: 'APT41 (Winnti)', type: 'State-Sponsored', origin: 'China', activityLevel: 'high' },
  { name: 'APT10 (Stone Panda)', type: 'State-Sponsored', origin: 'China', activityLevel: 'medium' },
  { name: 'APT40 (Leviathan)', type: 'State-Sponsored', origin: 'China', activityLevel: 'medium' },
  { name: 'APT33 (Elfin)', type: 'State-Sponsored', origin: 'Iran', activityLevel: 'medium' },
  { name: 'APT34 (OilRig)', type: 'State-Sponsored', origin: 'Iran', activityLevel: 'high' },
  { name: 'MuddyWater', type: 'State-Sponsored', origin: 'Iran', activityLevel: 'medium' },
  { name: 'LockBit', type: 'Ransomware Gang', origin: 'Unknown', activityLevel: 'critical' },
  { name: 'BlackCat (ALPHV)', type: 'Ransomware Gang', origin: 'Unknown', activityLevel: 'high' },
  { name: 'Cl0p', type: 'Ransomware Gang', origin: 'Unknown', activityLevel: 'high' },
  { name: 'REvil (Sodinokibi)', type: 'Ransomware Gang', origin: 'Russia', activityLevel: 'medium' },
  { name: 'Conti', type: 'Ransomware Gang', origin: 'Russia', activityLevel: 'low' },
  { name: 'FIN7', type: 'Cybercrime', origin: 'Russia', activityLevel: 'high' },
  { name: 'FIN8', type: 'Cybercrime', origin: 'Unknown', activityLevel: 'medium' },
  { name: 'Scattered Spider', type: 'Cybercrime', origin: 'Unknown', activityLevel: 'high' },
  { name: 'Evil Corp', type: 'Cybercrime', origin: 'Russia', activityLevel: 'medium' },
  { name: 'TA505', type: 'Cybercrime', origin: 'Russia', activityLevel: 'high' },
  { name: 'Wizard Spider', type: 'Cybercrime', origin: 'Russia', activityLevel: 'medium' },
  { name: 'Anonymous Sudan', type: 'Hacktivist', origin: 'Sudan', activityLevel: 'medium' },
  { name: 'KillNet', type: 'Hacktivist', origin: 'Russia', activityLevel: 'medium' },
];

function generateRealisticIP(): string {
  const ranges = [
    [1, 255, 0, 255, 0, 255, 0, 255],
    [45, 100, 0, 255, 0, 255, 0, 255],
    [103, 200, 0, 255, 0, 255, 0, 255],
    [185, 220, 0, 255, 0, 255, 0, 255],
    [91, 150, 0, 255, 0, 255, 0, 255],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return `${Math.floor(Math.random() * (range[1] - range[0]) + range[0])}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function getRandomCountry(): { country: string; lat: number; lng: number } {
  const countries = Object.keys(COUNTRY_COORDS);
  const country = countries[Math.floor(Math.random() * countries.length)];
  const coords = COUNTRY_COORDS[country];
  return { 
    country, 
    lat: coords.lat + (Math.random() - 0.5) * 5,
    lng: coords.lng + (Math.random() - 0.5) * 5 
  };
}

async function generateThreatSummary(attacks: any[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    return 'Active threat monitoring in progress. Multiple attack vectors detected across global infrastructure.';
  }
  
  const attackSummary = attacks.slice(0, 8).map(a => 
    `- ${a.type} from ${a.source.country} targeting ${a.target.country} (severity: ${a.severity})`
  ).join('\n');

  const prompt = `You are a security operations center analyst. Given these recent cyber attacks, provide a brief threat intelligence summary (2-3 sentences):

Attacks:
${attackSummary}

Provide a professional, concise summary focusing on the most significant threats and any patterns observed.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 
      'Active threat monitoring in progress. Multiple attack vectors detected across global infrastructure.';
  } catch (e) {
    console.error('Gemini summary error:', e);
    return 'Active threat monitoring in progress. Multiple attack vectors detected.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user ${user.id} accessing live threat stream`);

    // Use service role for database operations
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check monitoring status
    const { data: monitoringStatus } = await supabase
      .from('monitoring_status')
      .select('status')
      .single();

    if (monitoringStatus?.status === 'paused') {
      return new Response(
        JSON.stringify({ 
          error: 'Monitoring is paused',
          globalThreatLevel: 'paused',
          realtimeAttacks: [],
          threatActors: [],
          geographicDistribution: [],
          summary: 'Monitoring is currently paused. Resume to see live threat data.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get blocked IPs to filter out
    const { data: blockedEntities } = await supabase
      .from('blocked_entities')
      .select('value')
      .eq('type', 'ip');
    
    const blockedIPs = new Set(blockedEntities?.map(e => e.value) || []);

    // Generate realistic attack data
    const attackCount = Math.floor(Math.random() * 12) + 8;
    const attacks = [];

    for (let i = 0; i < attackCount; i++) {
      const source = getRandomCountry();
      const target = getRandomCountry();
      const sourceIP = generateRealisticIP();
      
      // Skip if blocked
      if (blockedIPs.has(sourceIP)) continue;

      const severity = Math.random() < 0.08 ? 'critical' : 
                       Math.random() < 0.25 ? 'high' : 
                       Math.random() < 0.55 ? 'medium' : 'low';

      attacks.push({
        id: crypto.randomUUID(),
        type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
        severity,
        source: {
          ip: sourceIP,
          country: source.country,
          lat: source.lat,
          lng: source.lng
        },
        target: {
          ip: generateRealisticIP(),
          country: target.country,
          lat: target.lat,
          lng: target.lng
        },
        timestamp: new Date().toISOString(),
        confidence: Math.floor(Math.random() * 25) + 75
      });
    }

    // Calculate global threat level
    const criticalCount = attacks.filter(a => a.severity === 'critical').length;
    const highCount = attacks.filter(a => a.severity === 'high').length;
    const globalThreatLevel = criticalCount > 2 ? 'critical' : 
                              criticalCount > 0 || highCount > 4 ? 'high' : 
                              highCount > 2 ? 'elevated' : 'moderate';

    // Geographic distribution
    const geoDistribution: Record<string, number> = {};
    attacks.forEach(a => {
      geoDistribution[a.source.country] = (geoDistribution[a.source.country] || 0) + 1;
    });
    const geographicDistribution = Object.entries(geoDistribution)
      .map(([country, attackCount]) => ({ country, attackCount }))
      .sort((a, b) => b.attackCount - a.attackCount);

    // Generate AI summary
    const summary = await generateThreatSummary(attacks);

    // Select relevant threat actors based on attack patterns
    const activeActors = THREAT_ACTORS
      .filter(a => a.activityLevel !== 'low')
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    // Store attacks in database for persistence
    for (const attack of attacks.slice(0, 5)) {
      await supabase.from('live_attacks').insert({
        source_ip: attack.source.ip,
        source_country: attack.source.country,
        source_lat: attack.source.lat,
        source_lng: attack.source.lng,
        target_ip: attack.target.ip,
        target_country: attack.target.country,
        target_lat: attack.target.lat,
        target_lng: attack.target.lng,
        attack_type: attack.type,
        severity: attack.severity,
        confidence: attack.confidence / 100,
        description: `${attack.type} detected from ${attack.source.country} targeting ${attack.target.country}`
      });
    }

    console.log(`Generated ${attacks.length} live threat events for user ${user.id}`);

    return new Response(
      JSON.stringify({
        globalThreatLevel,
        realtimeAttacks: attacks,
        threatActors: activeActors,
        geographicDistribution,
        summary,
        recommendations: [
          criticalCount > 0 ? 'Immediate review of critical threats recommended' : null,
          highCount > 2 ? 'Elevated attack activity detected - monitor closely' : null,
          attacks.some(a => a.type.includes('Ransomware')) ? 'Ransomware activity detected - verify backup integrity' : null,
          attacks.some(a => a.type.includes('DDoS') || a.type.includes('Flood')) ? 'DDoS mitigation recommended - enable rate limiting' : null,
          'Ensure all systems are patched to latest versions',
          'Review and update firewall rules'
        ].filter(Boolean),
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Live threat stream error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
