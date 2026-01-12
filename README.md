# ThreatPredict 🛡️

<div align="center">

![ThreatPredict](https://img.shields.io/badge/ThreatPredict-AI%20Cybersecurity-00d4ff?style=for-the-badge&logo=shield&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

**AI-Powered Cybersecurity Intelligence Platform**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Edge Functions](#-edge-functions)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

ThreatPredict is a comprehensive, enterprise-grade cybersecurity monitoring and threat intelligence platform. It combines real-time attack visualization, AI-powered threat prediction, and multi-modal security scanning to provide security teams with actionable insights and rapid incident response capabilities.

### Why ThreatPredict?

- **Proactive Defense**: AI-driven predictions help identify threats before they materialize
- **Unified Dashboard**: Single pane of glass for all security operations
- **Real-time Monitoring**: Live attack feeds with geographic visualization
- **Automated Response**: Auto-blocking capabilities for critical threats
- **Comprehensive Scanning**: Website, API, QR code, and static file analysis

---

## 🚀 Key Features

### 🛡️ Real-time Threat Monitoring
- **Live Attack Map**: Interactive 2D/3D visualization of global cyber attacks
- **Attack Globe**: Three.js powered 3D globe showing attack origins and targets
- **Threat Feed**: Real-time stream of security incidents with severity classification
- **Analytics Dashboard**: Comprehensive metrics, charts, and trend analysis
- **Blocked Attacks View**: Monitor and manage blocked threats

### 🔍 Multi-Modal Security Scanners
| Scanner | Description | Capabilities |
|---------|-------------|--------------|
| **Website Scanner** | Web application security assessment | XSS, SQLi, CSRF, misconfigurations |
| **API Scanner** | REST API endpoint security audit | Authentication, authorization, injection |
| **QR Scanner** | QR code malware detection | Malicious URLs, phishing attempts |
| **Static Scanner** | File-based security analysis | Malware signatures, suspicious patterns |

### 🤖 AI-Powered Intelligence
- **ThreatDoctor Chat**: Interactive AI assistant for security guidance with conversation persistence
- **Threat Predictions**: ML-driven analysis anticipating potential breaches
- **Auto-generated Recommendations**: Context-aware security suggestions
- **Markdown Rendering**: Rich text responses with syntax-highlighted code blocks

### 👥 Enterprise Management
- **Role-Based Access Control**: Admin, Analyst, Viewer roles
- **User Management**: Complete user lifecycle management
- **Audit Logging**: Comprehensive activity tracking
- **Export History**: Track and manage data exports

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER (React SPA)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Dashboard  │ │  Scanners   │ │  Monitoring │ │  AI Tools   │               │
│  │  ─────────  │ │  ─────────  │ │  ─────────  │ │  ─────────  │               │
│  │ • Stats     │ │ • Website   │ │ • Live Map  │ │ • Threat    │               │
│  │ • Charts    │ │ • API       │ │ • 3D Globe  │ │   Doctor    │               │
│  │ • Alerts    │ │ • QR Code   │ │ • Analytics │ │ • Predict   │               │
│  │ • Actions   │ │ • Static    │ │ • Feed      │ │   ions      │               │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        SHARED COMPONENTS                                  │  │
│  │  AppLayout • ProtectedRoute • Charts • Cards • Tables • Forms            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              STATE MANAGEMENT                                   │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐                      │
│  │ TanStack     │  │ React Hooks   │  │ Real-time       │                      │
│  │ Query        │  │ (Auth, Stats) │  │ Subscriptions   │                      │
│  └──────────────┘  └───────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE BACKEND                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         EDGE FUNCTIONS (Deno)                            │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ scan-website │ │ scan-api     │ │ analyze-qr   │ │ scan-static  │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │threat-doctor │ │ live-threat  │ │ block-entity │ │ export-cloud │    │   │
│  │  │    -chat     │ │   -stream    │ │              │ │              │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         POSTGRESQL DATABASE                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │   │
│  │  │live_attacks│ │ incidents  │ │ profiles   │ │ user_roles │            │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │   │
│  │  │blocked_*   │ │scan_results│ │audit_logs  │ │threat_doc* │            │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         AUTHENTICATION (RLS)                             │   │
│  │  • JWT-based authentication    • Row Level Security policies             │   │
│  │  • Role-based access control   • Secure session management               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL INTEGRATIONS                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                          │
│  │ Lovable AI   │  │ Gemini API   │  │ Threat Intel │                          │
│  │ Gateway      │  │ (Summaries)  │  │ Feeds        │                          │
│  └──────────────┘  └──────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request → React Router → Page Component → Custom Hook → Supabase Client
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
                    ▼                               ▼                               ▼
            Edge Function                   Database Query                  Real-time
            (scan-*, chat)                  (SELECT/INSERT)                 Subscription
                    │                               │                               │
                    └───────────────────────────────┼───────────────────────────────┘
                                                    │
                                                    ▼
                                            Response/Update
                                                    │
                                                    ▼
                                         UI State Update → Re-render
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Pre-built UI components |
| **TanStack Query** | Server state management |
| **React Router v6** | Client-side routing |
| **Framer Motion** | Animation library |

### Visualization
| Technology | Purpose |
|------------|---------|
| **Three.js** | 3D globe rendering |
| **@react-three/fiber** | React renderer for Three.js |
| **@react-three/drei** | Three.js helpers |
| **Recharts** | Chart components |
| **react-globe.gl** | Globe visualization |

### Backend (Supabase)
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database |
| **Edge Functions (Deno)** | Serverless API endpoints |
| **Row Level Security** | Data access control |
| **Real-time** | Live data subscriptions |
| **Auth** | User authentication |

### AI/ML Integration
| Service | Purpose |
|---------|---------|
| **Lovable AI Gateway** | ThreatDoctor chat assistant |
| **Gemini API** | Threat intelligence summaries |

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **bun** package manager
- **Supabase** account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd threat-predict
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:8080`

5. **Default Admin Credentials** (for testing)
   ```
   Email: Avinash@tp.com
   Password: 12345678
   ```

### Production Build

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
threat-predict/
├── public/                    # Static assets
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── components/           # React components
│   │   ├── ai/              # AI-related components
│   │   │   └── MarkdownMessage.tsx
│   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── RiskGauge.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── ThreatChart.tsx
│   │   │   └── ThreatFeed.tsx
│   │   ├── layout/          # Layout components
│   │   │   └── AppLayout.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Authentication hook
│   │   ├── useLiveThreatData.ts
│   │   ├── useSecurityStats.ts
│   │   └── useThreatDoctorChat.ts
│   ├── integrations/        # Third-party integrations
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client
│   │       └── types.ts     # Generated types
│   ├── lib/                 # Utility functions
│   │   └── utils.ts
│   ├── pages/               # Page components
│   │   ├── ai/             # AI features
│   │   │   ├── Predictions.tsx
│   │   │   └── ThreatDoctor.tsx
│   │   ├── monitor/        # Monitoring views
│   │   │   ├── Analytics.tsx
│   │   │   ├── BlockedAttacks.tsx
│   │   │   ├── GlobeView.tsx
│   │   │   ├── LiveMap.tsx
│   │   │   └── ThreatFeed.tsx
│   │   ├── scanner/        # Security scanners
│   │   │   ├── APIScanner.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── StaticScanner.tsx
│   │   │   └── WebsiteScanner.tsx
│   │   ├── users/          # User management
│   │   │   └── Roles.tsx
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Incidents.tsx
│   │   ├── Landing.tsx
│   │   ├── Settings.tsx
│   │   └── Users.tsx
│   ├── App.tsx              # Main app component
│   ├── index.css            # Global styles
│   └── main.tsx             # Entry point
├── supabase/
│   ├── functions/           # Edge functions
│   │   ├── analyze-qr/
│   │   ├── block-entity/
│   │   ├── export-to-cloud/
│   │   ├── live-threat-stream/
│   │   ├── monitor-control/
│   │   ├── multi-agent-analysis/
│   │   ├── scan-api/
│   │   ├── scan-static/
│   │   ├── scan-website/
│   │   └── threat-doctor-chat/
│   └── config.toml          # Supabase config
├── .env                      # Environment variables
├── tailwind.config.ts       # Tailwind configuration
└── vite.config.ts           # Vite configuration
```

---

## 🗄 Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `live_attacks` | Real-time attack data with geolocation |
| `blocked_attacks` | History of blocked attacks |
| `blocked_entities` | Blocked IPs/domains |
| `incidents` | Security incident records |
| `scan_results` | Scanner output storage |
| `threats` | Threat intelligence data |

### User Management

| Table | Description |
|-------|-------------|
| `profiles` | User profile information |
| `user_roles` | Role assignments (admin/analyst/viewer) |
| `audit_logs` | User activity audit trail |

### AI Features

| Table | Description |
|-------|-------------|
| `threat_doctor_conversations` | Chat conversation metadata |
| `threat_doctor_messages` | Individual chat messages |

### System

| Table | Description |
|-------|-------------|
| `monitoring_status` | System monitoring state |
| `export_history` | Export operation records |
| `realtime_logs` | System log storage |

---

## ⚡ Edge Functions

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `threat-doctor-chat` | `/functions/v1/threat-doctor-chat` | AI chat assistant |
| `live-threat-stream` | `/functions/v1/live-threat-stream` | Real-time threat data |
| `scan-website` | `/functions/v1/scan-website` | Website vulnerability scan |
| `scan-api` | `/functions/v1/scan-api` | API security audit |
| `analyze-qr` | `/functions/v1/analyze-qr` | QR code analysis |
| `scan-static` | `/functions/v1/scan-static` | Static file analysis |
| `block-entity` | `/functions/v1/block-entity` | Block IP/domain |
| `monitor-control` | `/functions/v1/monitor-control` | Monitoring state control |
| `export-to-cloud` | `/functions/v1/export-to-cloud` | Data export service |
| `multi-agent-analysis` | `/functions/v1/multi-agent-analysis` | Multi-agent threat analysis |

---

## 🔐 Security

### Authentication
- JWT-based authentication via Supabase Auth
- Secure session management with auto-refresh
- Protected routes for authenticated users

### Authorization
- Role-based access control (RBAC)
- Three roles: `admin`, `analyst`, `viewer`
- Row Level Security (RLS) policies on all tables

### Data Protection
- All API keys stored as environment variables
- Sensitive operations require admin role
- Comprehensive audit logging

See [SECURITY.md](./SECURITY.md) for security policy and vulnerability reporting.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](./LICENSE.txt) file for details.

---

<div align="center">

**Built with ❤️ for cybersecurity professionals**

[⬆ Back to top](#threatpredict-️)

</div>



https://github.com/user-attachments/assets/61ff753f-b093-4cd9-b2c4-2a494b8bd6d6



