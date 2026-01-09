<h1 align="center"> AI Study Hub </h1>
<p align="center"> The All-in-One Intelligent Dashboard for Modern Students and Lifelong Learners. </p>

<p align="center">
  <img alt="Build" src="https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge">
  <img alt="Issues" src="https://img.shields.io/badge/Issues-0%20Open-blue?style=for-for-the-badge">
  <img alt="Contributions" src="https://img.shields.io/badge/Contributions-Welcome-orange?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge">
</p>
<!-- 
  **Note:** These are static placeholder badges. Replace them with your project's actual badges.
  You can generate your own at https://shields.io
-->

## 📖 Table of Contents
*   [🌟 Overview](#-overview)
    *   [The Problem](#the-problem)
    *   [The Solution](#the-solution)
    *   [Architecture Overview](#architecture-overview)
*   [✨ Key Features](#-key-features)
*   [🛠️ Tech Stack & Architecture](#-tech-stack--architecture)
*   [📁 Project Structure](#-project-structure)
*   [🔐 Environment Variables](#-environment-variables)
*   [🚀 Getting Started](#-getting-started)
*   [🔧 Usage](#-usage)
*   [🤝 Contributing](#-contributing)
*   [📝 License](#-license)

---

## 🌟 Overview

AI Study Hub is a comprehensive web application designed to centralize and automate essential academic and personal productivity tasks. It acts as an intelligent, interactive dashboard providing students and researchers with a suite of AI-powered tools, task management utilities, and specialized academic resources, all within a single, elegant interface. Built on a modern and robust component-based architecture, AI Study Hub is engineered for speed, scalability, and an exceptional user experience.

### The Problem

> Students and researchers today rely on a fragmented ecosystem of digital tools: a standalone Pomodoro app for focus, a complex spreadsheet for grade tracking, separate websites for scientific data, and yet another tool for task management. This fragmentation leads to cognitive overload, wasted time switching contexts, and inconsistent data storage. Furthermore, the rise of generative AI necessitates tools to verify content originality and intelligently assist in learning, rather than just generating answers. The primary pain point is the lack of a unified, distraction-free environment where all academic necessities are integrated and enhanced by intelligence.

### The Solution

AI Study Hub addresses this fragmentation by providing a cohesive, feature-rich platform. By leveraging serverless functions for intelligent operations (like quiz generation and AI detection) and combining them with powerful client-side tools (like the Periodic Table viewer, Math Calculator, and dedicated Grade tracker), AI Study Hub empowers users to manage their studies efficiently. The interactive user interface, built with React, ensures that learners can transition seamlessly between deep work (Pomodoro), planning (Task Manager), and research (Data pages) without ever leaving the application.

### Architecture Overview

AI Study Hub utilizes a **Component-based Architecture** running entirely on the frontend, built with **React** and bundled using **Vite** for unparalleled development speed and optimized production builds.

The core application logic and state management are handled robustly using **TypeScript** and **Zustand**. While primarily a client-side application, it integrates deeply with **Supabase** via dedicated serverless edge functions for all intelligent and data-intensive services, ensuring the core application remains lightweight and responsive. The aesthetic is driven by **Tailwind CSS** and a comprehensive set of **shadcn/ui** components built on Radix UI, providing a professional, accessible, and customizable user experience.

---

## ✨ Key Features

AI Study Hub delivers specialized, integrated tools designed to maximize academic productivity and integrity. The entire user experience is interactive and fluid, thanks to the component-based approach powered by React.

### 🧠 Intelligent Academic Utilities

*   **Quiz Generation:** Instantly generate personalized quizzes based on user-provided material or topics. Leveraging the `generate-quiz` Supabase function, this feature transforms raw information into structured, manageable learning checks, supporting active recall and assessment.
*   **AI Content Detection:** Maintain academic integrity using the specialized **AIDetector** page. This tool leverages the `ai-detector` Supabase function to help users verify the originality of textual content, a crucial capability in the age of generative models.
*   **AI Chat & Task Suggestion:** Access the **AIAssistant** for immediate, contextual help. Backed by `ai-chat` and `ai-task-suggest` functions, the assistant provides guidance, explains complex concepts, and suggests next steps or tasks related to ongoing study sessions.

### 📅 Productivity and Focus Tools

*   **Integrated Task Management:** The **AITaskManager** provides a unified view for organizing all academic and personal commitments. Components like `TaskCalendarView` and `TaskTimePicker` offer visual scheduling and precise time allocation.
*   **Dedicated Focus Timer (Pomodoro):** Utilize the **Pomodoro** timer page to enforce focused work intervals and scheduled breaks, promoting deep concentration and preventing burnout. Task notifications are managed efficiently via the `useTaskNotifications` hook, keeping users on track.
*   **Intuitive Dashboard:** A personalized **Dashboard** provides a quick summary of essential information, including upcoming tasks, current progress, and quick access to frequently used tools, serving as the central hub of the application.

### 🔬 Specialized Academic Resources

*   **Periodic Table Explorer:** Instantly access chemical data via the dedicated **PeriodicTable** page, which loads its specialized data from `periodicTable.ts`, allowing for quick reference without external searches.
*   **Mathematics Calculator:** The **MathCalculator** provides complex computational power directly within the hub, streamlining problem-solving sessions.
*   **Grades Tracker:** Monitor academic progress effortlessly using the dedicated **Grades** page, allowing users to input and track scores, visualize performance, and calculate overall standing.

### 🎨 Polished User Experience

*   **Modern UI Components:** The application is built using an extensive library of accessible, high-quality UI components (e.g., `button`, `dialog`, `carousel`, `chart`, `form`, `toggle`, `slider`, `tabs`). This ensures a consistent, professional, and visually appealing experience that minimizes friction and enhances usability.
*   **Secure Authentication:** Features a dedicated **Auth** page, ensuring secure user sign-up and login through the verified Supabase integration, protecting personal study data and configurations.

---

## 🛠️ Tech Stack & Architecture

AI Study Hub is built upon a modern, performance-oriented technical foundation optimized for rapid development and exceptional client-side performance.

| Technology | Purpose | Why it was Chosen |
| :--- | :--- | :--- |
| **React** | Frontend Library | Provides an efficient, component-based paradigm for building complex, interactive user interfaces with optimized state rendering. |
| **TypeScript** | Primary Language | Ensures type safety throughout the codebase, leading to fewer runtime errors, enhanced maintainability, and improved developer experience. |
| **Vite** | Build Tool & Dev Server | Offers blazing-fast hot module replacement (HMR) and optimized, tree-shakable production bundles, significantly accelerating the development workflow. |
| **Tailwind CSS** | Utility-First CSS Framework | Enables rapid styling directly in markup, facilitating highly customizable, responsive, and maintainable design systems. |
| **Radix UI** | Accessibility Primitives | Forms the foundation for the custom UI components (`shadcn/ui`), ensuring all interactive elements are highly accessible, functional, and consistent. |
| **Zustand** | State Management | A fast, minimalist, and scalable state management solution, perfect for managing the application's global and local states with minimal boilerplate. |
| **Supabase** | Backend Services (BaaS) | Integrated via `@supabase/supabase-js`, it handles authentication and hosts the specialized serverless Edge Functions (`ai-detector`, `generate-quiz`, etc.) critical for AI features. |
| **Recharts** | Data Visualization | Used for generating interactive charts, allowing users to visualize academic data and task progress effectively on pages like Dashboard and Grades. |
| **React Router DOM** | Routing | Manages client-side navigation, enabling smooth transitions between the numerous specialized pages (e.g., AIDetector, Pomodoro, Dashboard). |

---

## 📁 Project Structure

The project employs a clear, scalable structure, separating UI components, business logic (stores, hooks), academic data, and Supabase integration logic.

```
📂 FlashSpeedie-ossm-nexus-8e159f5/
├── 📂 supabase/                    # Supabase backend configuration and serverless functions
│   ├── 📄 config.toml              # Supabase project configuration
│   ├── 📂 migrations/              # Database migration scripts (schema changes)
│   │   ├── 📄 20260103171357_0b4f75dc-0655-4e3a-be84-decbb8190163.sql
│   │   └── 📄 20260103172206_0743073c-945c-4c87-8610-919a9a38a8e9.sql
│   └── 📂 functions/               # Supabase Edge Functions (TS serverless logic)
│       ├── 📂 ai-detector/         # Function for detecting AI-generated content
│       │   └── 📄 index.ts
│       ├── 📂 generate-quiz/       # Function for generating quizzes based on input
│       │   └── 📄 index.ts
│       ├── 📂 ai-chat/             # Function for the AI Assistant chat interface
│       │   └── 📄 index.ts
│       └── 📂 ai-task-suggest/     # Function for suggesting tasks or next steps
│           └── 📄 index.ts
├── 📂 src/                        # Core application source code (React/TypeScript)
│   ├── 📄 index.css
│   ├── 📄 App.css
│   ├── 📄 App.tsx                  # Main component defining application structure and routing
│   ├── 📄 vite-env.d.ts
│   ├── 📄 main.tsx                 # Entry point for the React application
│   ├── 📂 data/                    # Static, internal academic data stores
│   │   └── 📄 periodicTable.ts     # Data structure for the Periodic Table page
│   ├── 📂 pages/                   # Top-level route components
│   │   ├── 📄 Dashboard.tsx        # Central user overview
│   │   ├── 📄 AIDetector.tsx       # AI content verification tool
│   │   ├── 📄 MathCalculator.tsx   # Integrated mathematical calculator
│   │   ├── 📄 AITaskManager.tsx    # Comprehensive task and schedule manager
│   │   ├── 📄 Grades.tsx           # Academic grade tracking and visualization
│   │   ├── 📄 Index.tsx            # Home or landing page
│   │   ├── 📄 Auth.tsx             # User authentication (Login/Signup)
│   │   ├── 📄 NotFound.tsx
│   │   ├── 📄 PeriodicTable.tsx    # Specialized periodic table viewer
│   │   ├── 📄 AIAssistant.tsx      # Entry point for the AI Chat functionality
│   │   ├── 📄 QuizGenerator.tsx    # Tool for generating custom quizzes
│   │   └── 📄 Pomodoro.tsx         # Focus timer utility
│   ├── 📂 types/                   # TypeScript global type definitions
│   │   └── 📄 index.ts
│   ├── 📂 components/              # Reusable UI components
│   │   ├── 📄 NavLink.tsx
│   │   ├── 📂 layout/
│   │   │   └── 📄 Sidebar.tsx      # Main navigation sidebar component
│   │   ├── 📂 ui/                  # Extensive Shadcn/Radix UI components
│   │   │   ├── 📄 alert.tsx
│   │   │   ├── 📄 input-otp.tsx
│   │   │   └── ... (40+ standard UI primitives: chart, form, table, toast, etc.)
│   │   └── 📂 tasks/               # Specialized components for Task Management
│   │       ├── 📄 TaskCalendarView.tsx # Calendar view for tasks
│   │       └── 📄 TaskTimePicker.tsx   # Utility for setting task durations
│   ├── 📂 lib/
│   │   └── 📄 utils.ts             # General utility functions (e.g., class merging)
│   ├── 📂 hooks/                   # Custom React Hooks
│   │   ├── 📄 useTaskNotifications.ts # Logic for managing task alerts/reminders
│   │   ├── 📄 use-mobile.tsx           # Hook for detecting mobile viewport size
│   │   └── 📄 use-toast.ts             # Hook integration for the toast notification system
│   ├── 📂 store/                   # Zustand state management definitions
│   │   └── 📄 useStore.ts          # Main global state definition
│   └── 📂 integrations/
│       └── 📂 supabase/            # Supabase client and types
│           ├── 📄 types.ts
│           └── 📄 client.ts        # Supabase client instantiation
├── 📂 public/
│   ├── 📄 favicon.ico
│   ├── 📄 placeholder.svg
│   └── 📄 robots.txt
├── 📄 package.json                 # Project dependencies and scripts
├── 📄 .env                         # Environment variables (critical for Supabase connection)
├── 📄 eslint.config.js             # ESLint configuration
├── 📄 vite.config.ts               # Vite build configuration
└── ... (other config files: tsconfig.json, tailwind.config.ts, bun.lockb, etc.)
```

---

## 🔐 Environment Variables

To connect the application to the necessary Supabase backend services and leverage the specialized AI functions, several environment variables must be defined in a `.env` file located in the root directory.

| Variable Name | Purpose | Example Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_PROJECT_ID` | Your unique identifier for the Supabase project. Used to scope resources. | `abc-123-def` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The public API key used by the client to interact with Supabase services (R/W access). | `eyJhbGciOiJIUzI1NiI...` |
| `VITE_SUPABASE_URL` | The base URL for your Supabase instance, directing client requests to the correct host. | `https://your-project.supabase.co` |

***Note on API Keys Setup:***
The Supabase integration is essential for authentication and running the four core intelligent functions (`ai-detector`, `generate-quiz`, `ai-chat`, `ai-task-suggest`). By configuring the required environment variables above, the application's `supabase/client.ts` will be correctly initialized, granting access to these backend capabilities without needing separate, ad-hoc API key setups.

---

## 🚀 Getting Started

To set up and run the AI Study Hub application locally, follow these steps.

### Prerequisites

You must have the following tools installed on your system:

*   **Node.js (LTS version)**: Required for the Node Package Manager (`npm`).
*   **npm**: Used as the primary package manager.
*   **TypeScript Knowledge**: The entire codebase is written in TypeScript.

### Installation

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/your-username/AI-Study-Hub.git
    cd AI-Study-Hub
    ```

2.  **Install Dependencies**

    Use the verified package manager, `npm`, to install all required dependencies specified in `package.json`:

    ```bash
    npm install
    ```

3.  **Configure Environment Variables**

    Create a `.env` file in the root directory of the project. Copy the required variables and populate them with your specific Supabase credentials.

    ```bash
    # Create the file
    touch .env
    
    # Example content for .env
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
    VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY"
    ```

4.  **Backend Setup (Supabase Functions)**

    Ensure that your Supabase project is configured with the four required functions (`ai-detector`, `generate-quiz`, `ai-chat`, `ai-task-suggest`), as defined in the `supabase/functions/` directory structure. These functions must be deployed to handle the core AI logic.

---

## 🔧 Usage

AI Study Hub is a client-side web application (`web_app`). Once installed, you can run the application using the verified scripts provided in `package.json`.

### Development Mode

To run the application locally with hot-reloading for development:

```bash
npm run dev
```
This command utilizes **Vite** to start a local development server, typically accessible at `http://localhost:5173`. Any changes saved in `src/` files will automatically refresh the browser.

### Building for Production

To create an optimized, production-ready build of the application:

```bash
npm run build
```
This script compiles the TypeScript and React code, bundles assets, and outputs the optimized static files to the `dist/` directory, ready for deployment to any static hosting service.

For a development-specific build, useful for staging or testing environments:

```bash
npm run build:dev
```

### Linting

To check the codebase against established ESLint configurations:

```bash
npm run lint
```
This is crucial for maintaining code quality, ensuring adherence to the project's standards, and catching potential issues early.

### Navigating the Application

Upon successful launch, the application routes the user through its key functional pages, including:

1.  **`/auth`**: Secure authentication and user account management.
2.  **`/dashboard`**: The central hub for all user activities.
3.  **`/aitaskmanager`**: Comprehensive task scheduling and time allocation, featuring the calendar view.
4.  **`/pomodoro`**: Access the dedicated focus timer.
5.  **`/periodic-table`**: View the specialized data set for academic reference.
6.  **`/grades`**: Track, input, and visualize academic performance data.

All interactions are handled via the highly responsive, interactive user interface powered by React.

---

## 🤝 Contributing

We welcome contributions to improve AI Study Hub! Your input helps make this project better for everyone. We believe in continuous improvement and highly value the insights and expertise of the open-source community.

### How to Contribute

The contribution process is standard for open-source projects. Please ensure you are basing your work on the `main` branch or a recent fork.

1. **Fork the repository** - Click the 'Fork' button at the top right of this page.
2. **Clone your fork locally**
    ```bash
    git clone https://github.com/your-username/AI-Study-Hub.git
    cd AI-Study-Hub
    ```
3. **Create a feature branch** 
   Name your branch descriptively (e.g., `feature/add-dark-mode` or `fix/task-calendar-bug`).
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Install dependencies**
   ```bash
   npm install
   ```
5. **Make your changes** - Improve code, documentation, or features. Ensure your code compiles correctly with TypeScript.
6. **Test thoroughly** - Run the application locally using `npm run dev` and ensure all affected functionality works as expected.
7. **Run the linter** - Ensure code quality standards are met before committing.
   ```bash
   npm run lint
   ```
8. **Commit your changes** - Write clear, descriptive commit messages. Follow the Conventional Commits style where appropriate.
   ```bash
   git commit -m 'Feat: Implement advanced grade calculation logic'
   ```
9. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
10. **Open a Pull Request** - Submit your changes for review against the main repository. Reference any related issues in the PR description.

### Development Guidelines

- ✅ **Coding Standards:** Follow the existing code style and conventions, particularly those enforced by `eslint.config.js`.
- 📝 **Documentation:** Add comments for complex logic, especially within hooks (`src/hooks/`) and utility functions (`src/lib/utils.ts`).
- 📚 **Feature Documentation:** If you add new functionality (e.g., a new page in `src/pages/` or a new component in `src/components/ui/`), please update the `README.md` and related documentation.
- 🔄 **Backward Compatibility:** Ensure backward compatibility when possible, especially for core utility functions and store operations in `src/store/useStore.ts`.
- 🎯 **Atomic Commits:** Keep commits focused; a single commit should ideally address one logical change or feature.

### Ideas for Contributions

We're looking for help with:

- 🐛 **Bug Fixes:** Report and fix bugs identified during usage, particularly around edge cases in data manipulation or UI states.
- ✨ **New Features:** Implement requested features from issues, focusing on enhancing the existing modules (e.g., advanced filtering for **AITaskManager**).
- 📖 **Documentation:** Improve the README, create user tutorials, or refine inline documentation.
- 🎨 **UI/UX:** Enhance the user interface and experience, especially concerning accessibility and mobile responsiveness (leveraging the `use-mobile.tsx` hook).
- ⚡ **Performance:** Optimize the performance of component rendering or state synchronization.
- 🧪 **Testing:** Increase test coverage (Note: While testing framework files were not explicitly analyzed, increasing testing robustness is always valuable).
- ♿ **Accessibility:** Enhance the accessibility of components beyond the Radix primitives, ensuring adherence to WCAG standards.

### Code Review Process

- All submissions require review by a maintainer before merging.
- Maintainers will provide constructive feedback focused on quality and alignment with project goals.
- Changes may be requested before approval.
- Once approved, your PR will be merged, and you will be credited as a contributor!

### Questions?

Feel free to open an issue for any questions or concerns regarding development, feature requests, or project scope. We're here to help!

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

### What this means:

- ✅ **Commercial use:** You can use this project commercially.
- ✅ **Modification:** You can modify the code to suit your specific needs.
- ✅ **Distribution:** You can distribute this software in modified or unmodified forms.
- ✅ **Private use:** You can use this project privately for personal learning or development.
- ⚠️ **Liability:** The software is provided "as is," without warranty of any kind, express or implied.
- ⚠️ **Trademark:** This license does not grant rights to use the project's official name, logos, or trademarks.

---

<p align="center">Made with ❤️ by the AI Study Hub Team</p>
<p align="center">
  <a href="#-overview">⬆️ Back to Top</a>
</p>
