class NoteTemplate {
  final String id;
  final String title;
  final String icon;
  final String category;
  final String description;
  final List<String> tags;
  final String content;

  const NoteTemplate({
    required this.id,
    required this.title,
    required this.icon,
    required this.category,
    required this.description,
    required this.tags,
    required this.content,
  });
}

class NoteTemplates {
  NoteTemplates._();

  static const List<NoteTemplate> templates = [
    NoteTemplate(
      id: 'meeting-notes',
      title: 'Meeting notes',
      icon: '📋',
      category: 'Productivity',
      description: 'Keep the agenda, decisions, and next steps together.',
      tags: ['meeting', 'work'],
      content: '''# 📋 Meeting: [Topic / Purpose]

**Date:** [Today]
**Attendees:** @Team
**Status:** ✅ Complete

---

## 🎯 Objectives
- [ ] Align on core deliverables and timeline
- [ ] Review blockers and technical decisions

## 📝 Discussion Points
- 
- 
- 

## 💡 Decisions Made
1. 
2. 

## 🚀 Action Items
- [ ] Task 1 - @Owner (Due: Friday)
- [ ] Task 2 - @Owner (Due: Next Week)
''',
    ),
    NoteTemplate(
      id: 'project-spec',
      title: 'Project plan',
      icon: '🚀',
      category: 'Project',
      description: 'Outline the goal, key details, and next steps.',
      tags: ['project', 'spec', 'roadmap'],
      content: '''# 🚀 Project Spec: [Project Title]

**Status:** 🟡 In Progress | **Owner:** Lead | **Target Launch:** Q4

---

## 📌 Problem Statement
What problem are we solving? Why is it important to solve now?

## 🎯 Goals & Non-Goals
### Core Goals
- Deliver a fast, modern and polished mobile experience.
- Provide seamless offline-first storage and instant full-text search.

### Non-Goals
- Real-time multi-user collaborative cursor sync.

## 🏗️ Architecture & Technical Approach
- **Platform:** Native Flutter (iOS / Android)
- **Cloud Sync:** Private Google Drive `appDataFolder`
- **Design:** Apple Human Interface Guidelines (Cupertino)

## 📅 Milestones & Timeline
- [x] Phase 1: Research and architecture design
- [ ] Phase 2: Core feature implementation
- [ ] Phase 3: Testing, polishing, and release
''',
    ),
    NoteTemplate(
      id: 'daily-journal',
      title: 'Daily journal',
      icon: '☀️',
      category: 'Personal',
      description: 'Make space for your priorities, thoughts, and reflections.',
      tags: ['journal', 'daily', 'reflection'],
      content: '''# ☀️ Daily Journal

> "Small daily improvements over time lead to stunning results."

---

## 🎯 Top 3 Priorities Today
- [ ] Priority 1: 
- [ ] Priority 2: 
- [ ] Priority 3: 

## 🧠 Brain Dump & Flow of Thoughts
- 

## 🏆 Wins & Accomplishments
- 

## 🙏 Daily Gratitude
1. 
2. 
3. 
''',
    ),
    NoteTemplate(
      id: 'tech-runbook',
      title: 'Technical guide',
      icon: '🛠️',
      category: 'Engineering',
      description: 'Keep setup instructions and useful checks in one place.',
      tags: ['engineering', 'devops', 'runbook'],
      content: '''# 🛠️ Runbook: [Service / System Name]

**Tier:** Production Critical | **Maintainer:** DevOps / Engineering

---

## 📖 System Overview
Describe the service architecture, dependencies, and SLA requirements.

## ⚙️ Prerequisites & Setup
```bash
# Install dependencies
flutter pub get

# Run on iOS simulator
flutter run
```

## 🩺 Health Checks & Verification
- **Cloud Sync:** Status active
- **Database:** Local storage synced

## 🚨 Troubleshooting Common Incidents
| Symptom | Probable Cause | Action |
| --- | --- | --- |
| Sync Pending | Network offline | Reconnect to internet |
| Token Expired | Google grant refresh | Re-authenticate via Settings |
''',
    ),
    NoteTemplate(
      id: 'brainstorming',
      title: 'Ideas',
      icon: '💡',
      category: 'Productivity',
      description: 'Capture an idea and decide what to try next.',
      tags: ['ideas', 'brainstorming'],
      content: '''# 💡 Idea Sandbox: [Concept Name]

---

## 🌟 The Vision
What is the core breakthrough idea in a single sentence?

## 🔍 Why It Matters
- Customer pain point solved:
- Value proposition & differentiation:

## ⚖️ Pros & Cons Analysis
### Pros
- Fast execution
- High leverage impact

### Cons & Potential Risks
- Technical hurdles
- Resource constraints

## 🧪 Experiments & Next Steps
- [ ] Validate problem with 3 target users
- [ ] Build rapid proof of concept
- [ ] Review findings and decide Go / No-Go
''',
    ),
    NoteTemplate(
      id: 'sprint-planning',
      title: 'Weekly plan',
      icon: '🎯',
      category: 'Project',
      description: 'Choose priorities and plan the work ahead.',
      tags: ['sprint', 'agile', 'planning'],
      content: '''# 🎯 Sprint Planning: [Sprint Name / Week]

---

## 📊 Sprint Goals
1. Deliver modern UI/UX redesign and workspace dashboard
2. Improve app responsiveness and interaction speed

## 📋 Sprint Backlog
### 🔥 High Priority
- [ ] Feature 1:
- [ ] Feature 2:

### ⚡ Medium Priority
- [ ] Feature 3:
- [ ] Refactor & cleanup:

## 🛑 Blockers & Risks
- None identified yet.
''',
    ),
  ];
}
