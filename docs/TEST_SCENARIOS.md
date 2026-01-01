# Access Nature - Beta Test Scenarios

## Version 1.0 - December 2024

This document provides comprehensive test scenarios for beta testing Access Nature. Testers should work through each scenario and report any issues found.

---

## Table of Contents

1. [Authentication Tests](#1-authentication-tests)
2. [Trail Recording Tests](#2-trail-recording-tests)
3. [Accessibility Survey Tests](#3-accessibility-survey-tests)
4. [Trail Guide Tests](#4-trail-guide-tests)
5. [Barrier Report Tests](#5-barrier-report-tests)
6. [Profile Tests](#6-profile-tests)
7. [Offline Functionality Tests](#7-offline-functionality-tests)
8. [Mobile Responsiveness Tests](#8-mobile-responsiveness-tests)
9. [Accessibility (A11y) Tests](#9-accessibility-a11y-tests)
10. [Cross-Browser Tests](#10-cross-browser-tests)
11. [Performance Tests](#11-performance-tests)
12. [Error Handling Tests](#12-error-handling-tests)

---

## 1. Authentication Tests

### 1.1 Email Sign Up
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to index.html | Landing page loads |
| 2 | Click "Sign In" button | Auth modal opens |
| 3 | Click "Sign up" link | Signup form appears |
| 4 | Enter valid name, email, password | Fields accept input |
| 5 | Click "Create Account" | Account created, modal closes |
| 6 | Check navigation | Profile link appears in menu |
| 7 | Check hero section | Shows "Welcome back, [name]!" |

### 1.2 Email Sign In
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign out if signed in | Returns to guest state |
| 2 | Click "Sign In" button | Auth modal opens |
| 3 | Enter valid credentials | Fields accept input |
| 4 | Click "Sign In" | Signed in successfully |
| 5 | Refresh page | Stays signed in |

### 1.3 Invalid Credentials
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Sign In" | Auth modal opens |
| 2 | Enter invalid email format | Shows validation error |
| 3 | Enter wrong password | Shows "Invalid credentials" error |
| 4 | Leave fields empty and submit | Shows required field errors |

### 1.4 Sign Out
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While signed in, click "Sign Out" | Confirmation dialog appears |
| 2 | Confirm sign out | Returns to guest state |
| 3 | Check navigation | Profile link hidden |
| 4 | Check hero section | Shows "Sign In" button |

### 1.5 Session Persistence
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in on index.html | Successful |
| 2 | Navigate to tracker.html | Still signed in |
| 3 | Navigate to reports.html | Still signed in |
| 4 | Navigate to profile.html | Profile loads with user data |
| 5 | Close browser, reopen | Still signed in |

---

## 2. Trail Recording Tests

### 2.1 Basic Trail Recording
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to tracker.html | Map loads centered on location |
| 2 | Allow location permission | Blue dot shows current position |
| 3 | Click Start (▶) button | Timer starts, recording begins |
| 4 | Walk for 1-2 minutes | Route draws on map, distance updates |
| 5 | Click Pause (⏸) button | Timer pauses, route stops updating |
| 6 | Click Resume (▶) button | Recording resumes |
| 7 | Click Stop (⏹) button | Recording stops, save dialog appears |

### 2.2 Photo Capture During Recording
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start recording | Recording active |
| 2 | Click Camera (📷) button | Camera/file picker opens |
| 3 | Take or select photo | Photo added with GPS location |
| 4 | Check photo marker on map | Marker appears at capture location |
| 5 | Click photo marker | Photo preview shows |

### 2.3 Text Notes During Recording
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start recording | Recording active |
| 2 | Click Note (📝) button | Note input dialog opens |
| 3 | Enter note text | Text accepted |
| 4 | Save note | Note marker appears on map |
| 5 | Click note marker | Note content displays |

### 2.4 Route Data Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record a route (at least 5 mins) | Route recorded |
| 2 | Click Map (🗺) button | Route data overlay shows |
| 3 | Check elevation data | If available, shows elevation |
| 4 | Check statistics | Distance, time, avg speed shown |

---

## 3. Accessibility Survey Tests

### 3.1 Opening Survey
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Accessibility (♿) button | Survey modal opens |
| 2 | Check modal display | All 16 categories visible |
| 3 | Check scrolling | Modal scrolls smoothly |
| 4 | Click outside modal | Modal stays open (intentional) |
| 5 | Click X button | Modal closes |

### 3.2 Completing Survey
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open survey | Modal opens |
| 2 | Fill in Trip Type | Selection saves |
| 3 | Fill in Surface Quality | Options selectable |
| 4 | Fill in Wheelchair Access | Radio buttons work |
| 5 | Complete all sections | All fields accept input |
| 6 | Click "Save Survey" | Survey data saved |
| 7 | Check toast notification | "Survey saved" message |

### 3.3 Survey Persistence
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete and save survey | Survey saved |
| 2 | Close survey modal | Modal closes |
| 3 | Reopen survey | Previous answers preserved |
| 4 | Navigate away and return | Data still preserved |

---

## 4. Trail Guide Tests

### 4.1 Generate Trail Guide
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record a trail with survey | Trail with accessibility data |
| 2 | Stop recording | Save dialog appears |
| 3 | Enter trail name | Name accepted |
| 4 | Click "Generate Guide" | Guide generation starts |
| 5 | Wait for completion | Trail guide preview shows |
| 6 | Check guide content | Route map, photos, accessibility info |

### 4.2 View Trail Guide
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Guides panel | Panel opens |
| 2 | Click on a guide | Guide modal opens |
| 3 | Check map | Route displayed |
| 4 | Check photos | Photo gallery loads |
| 5 | Check accessibility info | Survey data shown |
| 6 | Check share/download options | Buttons functional |

### 4.3 Publish Trail Guide
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a trail guide | Guide created |
| 2 | Click "Publish" or toggle | Publish dialog/toggle appears |
| 3 | Confirm publish | Guide published |
| 4 | Navigate to index.html | Guide appears in community browser |
| 5 | Search for guide | Guide found in search |

### 4.4 Download Trail Guide (PDF)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open trail guide | Guide modal open |
| 2 | Click "Download PDF" | PDF generation starts |
| 3 | Wait for completion | PDF downloads |
| 4 | Open PDF | Content displays correctly |

---

## 5. Barrier Report Tests

### 5.1 Submit New Report
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to reports.html | Reports page loads |
| 2 | Click "Report Barrier" | Report form opens |
| 3 | Allow location access | Map shows current location |
| 4 | Select issue type | Options available |
| 5 | Select severity | Rating selectable |
| 6 | Add description | Text field works |
| 7 | Add photo (optional) | Photo uploads |
| 8 | Click "Submit" | Report submitted |
| 9 | Check map | New marker appears |

### 5.2 View Reports on Map
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to reports.html | Map loads with markers |
| 2 | Click on marker | Report details popup |
| 3 | Check popup content | Type, severity, description shown |
| 4 | Check clustering | Multiple reports cluster |

### 5.3 Filter Reports
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select status filter | Reports filter by status |
| 2 | Select severity filter | Reports filter by severity |
| 3 | Select type filter | Reports filter by type |
| 4 | Clear filters | All reports show |

### 5.4 Update Report Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on own report | Report details open |
| 2 | Change status | Status updates |
| 3 | Check report list | Updated status shown |

---

## 6. Profile Tests

### 6.1 View Profile
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in | Signed in |
| 2 | Navigate to profile.html | Profile page loads |
| 3 | Check avatar | Shows initial or photo |
| 4 | Check name/email | Correct info displayed |
| 5 | Check stats | Trail count, distance, reports |

### 6.2 Update Display Name
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Edit" on display name | Edit field appears |
| 2 | Enter new name | Field accepts input |
| 3 | Click "Save" | Name updates |
| 4 | Refresh page | New name persists |

### 6.3 Mobility Profile
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find Mobility Profile section | Section visible |
| 2 | Update preferences | Options selectable |
| 3 | Save changes | Preferences saved |
| 4 | Check trail recommendations | Filtered by preferences |

### 6.4 Export User Data
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Export My Data" | Export starts |
| 2 | Wait for completion | JSON file downloads |
| 3 | Open JSON file | Contains trails, reports, profile |

### 6.5 Delete Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Delete Account" | Confirmation dialog |
| 2 | Enter password | Password required |
| 3 | Confirm deletion | Account deleted |
| 4 | Check sign in | Cannot sign in with old credentials |

---

## 7. Offline Functionality Tests

### 7.1 Offline Recording
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable airplane mode | Offline |
| 2 | Open tracker.html | App loads from cache |
| 3 | Start recording | Recording works |
| 4 | Take photos | Photos saved locally |
| 5 | Stop recording | Data saved locally |
| 6 | Disable airplane mode | Online |
| 7 | Check sync | Data syncs to cloud |

### 7.2 Offline Indicator
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go offline | Offline indicator appears |
| 2 | Try cloud features | Graceful error messages |
| 3 | Go online | "Back online" toast |

### 7.3 Data Sync Conflict
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record trail offline | Saved locally |
| 2 | Edit same trail on another device | Different version |
| 3 | Go online | Conflict resolution shown |

---

## 8. Mobile Responsiveness Tests

Test at each breakpoint:

### 8.1 iPhone SE (320px)
| Page | Check | Expected |
|------|-------|----------|
| index.html | Hero section | Text readable, not cramped |
| index.html | Nav cards | Stack vertically |
| tracker.html | Controls | All buttons accessible |
| tracker.html | Bottom nav | Buttons fit |
| reports.html | Filter grid | Stack vertically |
| profile.html | Stats | 2-column grid |

### 8.2 iPhone 14 (390px)
| Page | Check | Expected |
|------|-------|----------|
| All | Modals | Fit screen width |
| All | Touch targets | Min 44x44px |
| All | Text | 16px min for inputs |

### 8.3 iPhone Pro Max (428px)
| Page | Check | Expected |
|------|-------|----------|
| All | Spacing | Comfortable margins |
| All | Images | Scale appropriately |

### 8.4 iPad (768px)
| Page | Check | Expected |
|------|-------|----------|
| index.html | Nav cards | 2-column grid |
| All | Navigation | Desktop nav shows |

### 8.5 Landscape Mode
| Page | Check | Expected |
|------|-------|----------|
| tracker.html | Map | Fills available space |
| All | Modals | Scrollable if needed |

---

## 9. Accessibility (A11y) Tests

### 9.1 Keyboard Navigation
| Test | Action | Expected |
|------|--------|----------|
| Tab order | Tab through page | Logical order |
| Skip link | Press Tab first | "Skip to content" appears |
| Modal focus | Open modal | Focus trapped in modal |
| Escape key | Press Escape | Closes modals |
| Enter key | On buttons | Activates button |

### 9.2 Screen Reader
| Test | Expected |
|------|----------|
| Page title | Announces page name |
| Navigation | Announces links |
| Buttons | Announces purpose |
| Forms | Announces labels |
| Errors | Announces error messages |
| Loading | Announces "loading" |

### 9.3 Color Contrast
| Element | Check |
|---------|-------|
| Body text | Min 4.5:1 ratio |
| Large text | Min 3:1 ratio |
| Buttons | Readable in all states |
| Error text | Distinguishable |

### 9.4 High Contrast Mode
| Test | Expected |
|------|----------|
| Enable high contrast | Colors adjust |
| Navigation | Visible and readable |
| Buttons | Clearly distinguishable |
| Focus states | Highly visible |

---

## 10. Cross-Browser Tests

### 10.1 Chrome (Desktop & Android)
- [ ] All pages load correctly
- [ ] GPS tracking works
- [ ] Camera access works
- [ ] IndexedDB storage works
- [ ] Service worker installs

### 10.2 Safari (macOS & iOS)
- [ ] All pages load correctly
- [ ] GPS tracking works
- [ ] Camera access works
- [ ] LocalStorage works
- [ ] PWA "Add to Home Screen" works

### 10.3 Firefox (Desktop)
- [ ] All pages load correctly
- [ ] GPS tracking works
- [ ] Camera access works
- [ ] IndexedDB storage works

### 10.4 Edge (Desktop)
- [ ] All pages load correctly
- [ ] All features functional

---

## 11. Performance Tests

### 11.1 Page Load Time
| Page | Target | Metric |
|------|--------|--------|
| index.html | < 3s | First Contentful Paint |
| tracker.html | < 4s | Time to Interactive |
| reports.html | < 3s | First Contentful Paint |

### 11.2 Memory Usage
| Scenario | Check |
|----------|-------|
| Long recording (30+ mins) | No memory leak |
| Many photos (10+) | Memory stable |
| Page left open (1+ hour) | Memory stable |

### 11.3 Battery Usage
| Scenario | Check |
|----------|-------|
| GPS tracking (30 mins) | Reasonable drain |
| Background sync | No excessive drain |

---

## 12. Error Handling Tests

### 12.1 Network Errors
| Scenario | Expected |
|----------|----------|
| API timeout | "Connection error" toast |
| Server error (500) | "Something went wrong" message |
| Network loss during save | Data queued, syncs later |

### 12.2 Permission Errors
| Scenario | Expected |
|----------|----------|
| Location denied | Clear instruction to enable |
| Camera denied | Fallback to file picker |
| Notification denied | App continues working |

### 12.3 Validation Errors
| Scenario | Expected |
|----------|----------|
| Empty required field | Field highlighted, message shown |
| Invalid email | "Invalid email" message |
| Password too short | "Min 6 characters" message |

### 12.4 Storage Errors
| Scenario | Expected |
|----------|----------|
| IndexedDB full | Warning, suggest cleanup |
| Firebase quota | Graceful degradation |

---

## Bug Report Template

When reporting bugs, include:

```
### Bug Title
Brief description

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- Device: 
- OS: 
- Browser: 
- App Version: 

### Screenshots/Videos
If applicable

### Console Errors
Any error messages
```

---

## Test Completion Checklist

- [ ] Authentication (all 5 scenarios)
- [ ] Trail Recording (all 4 scenarios)
- [ ] Accessibility Survey (all 3 scenarios)
- [ ] Trail Guides (all 4 scenarios)
- [ ] Barrier Reports (all 4 scenarios)
- [ ] Profile (all 5 scenarios)
- [ ] Offline (all 3 scenarios)
- [ ] Mobile Responsiveness (all 5 breakpoints)
- [ ] Accessibility (all 4 categories)
- [ ] Cross-Browser (all 4 browsers)
- [ ] Performance (all 3 categories)
- [ ] Error Handling (all 4 categories)

---

*Last Updated: December 2024*
*Version: 1.0*
