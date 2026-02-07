# 🎓 Masarat - Student Achievement Tracking System

**"A Generation of Ambition and Excellence"**

A comprehensive web-based platform for tracking student achievements, managing teacher evaluations, and fostering academic excellence at Abha Private Elementary School.

---

## 📋 Overview

Masarat is a modern student achievement tracking system designed to motivate students through a points-based reward system and motivational levels. The platform enables administrators to manage student records, teachers to vote for outstanding students, and provides transparent leaderboards for all stakeholders.

### Key Features

- 🏆 **Points-Based Achievement System** - Track and reward student progress
- 📊 **Motivational Levels** - Five-tier system from "Beginner" to "Role Model"
- 🗳️ **Weekly Teacher Voting** - Democratic teacher participation in student recognition
- 📈 **Real-time Leaderboards** - Display top-performing students
- 👥 **Multi-Role Access** - Separate interfaces for administrators, teachers, and public viewers
- 📱 **Responsive Design** - Optimized for mobile, tablet, and desktop
- 🌙 **Dark Mode Interface** - Modern, eye-friendly design
- 📄 **PDF Report Generation** - Export comprehensive achievement reports

---

## 🚀 Technology Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Wouter** - Lightweight routing
- **Recharts** - Data visualization
- **shadcn/ui** - High-quality component library

### Backend
- **Express 4** - Web application framework
- **tRPC 11** - End-to-end typesafe APIs
- **Drizzle ORM** - TypeScript ORM
- **MySQL/TiDB** - Relational database
- **JWT** - Secure authentication

### Development Tools
- **Vite** - Fast build tool
- **Vitest** - Unit testing framework
- **pnpm** - Efficient package manager

---

## 📦 Installation

### Prerequisites

- Node.js 22.x or higher
- pnpm 9.x or higher
- MySQL 8.x or compatible database

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/w2ksa/masarat-edu-tracker.git
   cd masarat-edu-tracker
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure the following:
   - `VITE_ADMIN_CODE` - Administrator access code
   - `VITE_TEACHER_CODE` - Teacher access code
   - `DATABASE_URL` - MySQL connection string
   - `JWT_SECRET` - Secret key for JWT tokens

4. **Initialize the database**
   ```bash
   pnpm db:push
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Open your browser to `http://localhost:3000`

---

## 🎯 User Roles

### 1. **System Administrator**
- Add/edit student points with comments
- Manage teacher records
- Open/close weekly voting periods
- View comprehensive statistics and reports
- Export PDF reports
- Manage student database (add/edit/delete)

### 2. **Teachers**
- Vote for 3 outstanding students per week
- Each vote automatically adds 10 points to the student
- View student lists filtered by grade
- Cannot vote multiple times in the same period

### 3. **Public Viewers**
- Browse all students and their achievement levels
- Search students by name
- Filter by grade (4th, 5th, 6th)
- View top 5 leaderboard
- Access detailed student profiles

---

## 🏅 Motivational Levels

Students are categorized into five motivational levels based on their accumulated points:

| Level | Points Range | Icon | Description |
|-------|--------------|------|-------------|
| 🌱 **Beginner** (مُبادر) | 0 - 99 | Green | Starting their journey |
| 📚 **Diligent** (مُجتهد) | 100 - 199 | Blue | Showing consistent effort |
| ⚡ **Disciplined** (مُنضبط) | 200 - 299 | Purple | Demonstrating discipline |
| ⭐ **Distinguished** (مُتميز) | 300 - 599 | Red | Standing out from peers |
| 👑 **Role Model** (قُدوة) | 600+ | Gold | Exemplary achievement |

---

## 📊 Supported Grades

The system currently supports three grade levels:

- **4th Grade** - 102 students
- **5th Grade** - 82 students
- **6th Grade** - 66 students

**Total**: 250 students

---

## 🔔 Automated Notifications

The system automatically sends notifications to administrators when:

- A student reaches "Role Model" level (600+ points)
- A student receives 5+ votes in a single week

---

## 📸 Screenshots

### Home Page
- Student list with search and filtering
- Top 5 leaderboard
- Grade-based tabs

### Admin Dashboard
- Student management interface
- Teacher management
- Voting control panel
- Statistics and analytics
- PDF report generation

### Teacher Portal
- Student voting interface
- Grade filtering
- Voting status display

---

## 🛠️ Development

### Project Structure

```
masarat-edu-tracker/
├── client/                 # Frontend application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Page components
│       ├── lib/           # Utilities and tRPC client
│       └── hooks/         # Custom React hooks
├── server/                # Backend application
│   ├── routers.ts         # tRPC procedures
│   ├── db.ts              # Database query helpers
│   └── _core/             # Core server utilities
├── drizzle/               # Database schema and migrations
│   └── schema.ts          # Database table definitions
├── shared/                # Shared types and constants
└── storage/               # File storage utilities
```

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Database
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio

# Testing
pnpm test             # Run unit tests
pnpm test:ui          # Run tests with UI

# Code Quality
pnpm lint             # Lint code
pnpm type-check       # Check TypeScript types
```

### Adding New Students

Use the admin interface to add students individually, or create a seed script:

```typescript
// scripts/seed-students.ts
import { db } from './server/db';
import { students } from './drizzle/schema';

const newStudents = [
  { name: 'Student Name', grade: '4th', score: 0 },
  // ... more students
];

await db.insert(students).values(newStudents);
```

---

## 🔒 Security

- All passwords are removed from the public repository
- Authentication codes should be configured via environment variables
- JWT tokens are used for secure session management
- Cookie-based voting prevention to avoid duplicate votes
- Input validation on all user inputs

---

## 📞 Contact Information

For technical support or inquiries:

1. **Rayan Musfer Al-Qahtani** (Elementary Student Counselor)
   - 📱 050 700 8853

2. **Faris Al Sheikh** (Upper Grades Student Counselor)
   - 📱 055 257 8870

3. **Saud Al Zayed** (Technical Support)
   - 📱 055 815 2510

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Abha Private Elementary School for supporting this initiative
- All teachers and administrators who contributed to the system design
- Students whose achievements inspire continuous improvement

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📈 Future Enhancements

- [ ] Student voting for teachers
- [ ] Historical points tracking
- [ ] Excel export functionality
- [ ] Monthly statistics dashboard
- [ ] Email/SMS notifications
- [ ] Multi-language support
- [ ] Mobile application

---

**Made with ❤️ for Abha Private Elementary School**
