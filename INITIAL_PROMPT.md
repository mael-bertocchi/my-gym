**Project Overview:**

Act as an expert full-stack developer. I want to build a personal, single-user workout tracking application. I am developing on Windows and targeting an iPhone 17 Pro.

**Design & UX Philosophy:**

* **Inspiration:** Similar to "Hevy" but strictly non-collaborative (no social features or feeds).

* **UI Style:** Minimalist, clean, and highly intuitive.

* **Frictionless:** Logging sets and reps during a workout must require minimal taps.

**Tech Stack:**

* **Frontend:** React Native (using Expo) with TypeScript.

* **Backend:** Fastify with TypeScript.

* **Database:** PostgreSQL managed via Prisma ORM.

* **AI Integration:** Azure Foundry endpoint. Or even a free one.

**Core Features & Data Architecture:**

**1. Progressive Database (Empty State First)**

* The app starts with an empty exercise database. Users add exercises dynamically as they perform them.

**2. Granular Equipment & Machine Tracking (Crucial)**

* An exercise must be definable by the specific equipment used (e.g., Dumbbell, Cable, Machine).

* If "Machine" is selected, the user must assign a manufacturer/brand (e.g., Matrix, LifeFitness).

* *Logic requirement:* A "Chest Press" on a Matrix machine must have a completely separate progression track from a "Chest Press" on a LifeFitness machine.

**3. Location-Aware Workouts**

* Workouts must be taggable by gym brand (e.g., Fitness Park, Basic Fit) and specific gym location.

* The database must support filtering statistics based on these locations.

**4. Exercise Execution & Previews**

* Each exercise detail view requires a visual preview placeholder and a text summary of the correct form/cues.

**5. AI Integration (Fastify Backend)**

* **Onboarding:** When a user creates a new exercise, the Fastify backend will call the Anthropic API to automatically generate the form summary, instructions, and equipment tips.

* **Personal Assistant:** An endpoint that analyzes the user's PostgreSQL workout history to provide actionable advice on progressive overload.

**Initial Execution Task:**

Do not write any React Native code yet.

1. Set up the backend folder structure for Fastify.

2. Write the complete `schema.prisma` file containing the explicit relational models required to make the Location, Equipment, and Exercise logic work.

Wait for my approval on the Prisma schema before proceeding to the backend routes or frontend UI.

This must be in a monorepo structure, with the backend and frontend in separate folders. It will be pushed to a GitHub repository. For the backend structure you can take example from the repositories located at `C:\Users\ma3lb\Documents\Bitbucket\SafeLedger\Core\Frontend` and `C:\Users\ma3lb\Documents\Bitbucket\JetAviation\Vector\Backend`.
