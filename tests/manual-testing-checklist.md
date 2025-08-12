# i18n Fail-Fast Manual Testing Checklist

## Quick Validation Checklist

Use this checklist to manually validate the i18n fail-fast implementation is working correctly.

## 🔧 Pre-Testing Setup

- [ ] Development server running (`npm run dev`)
- [ ] All 7 language files present in `src/content/i18nUI/`
- [ ] Backup created of translation files (optional but recommended)
- [ ] Browser console open for error monitoring

## 1️⃣ Normal Operation Tests (5 min)

### ✅ Baseline Functionality
- [ ] **Homepage loads**: Visit `http://localhost:4321/`
- [ ] **Chinese locale loads**: Visit `http://localhost:4321/zh/`  
- [ ] **All navigation items show**: Check navigation menu
- [ ] **Footer renders correctly**: Check footer content
- [ ] **No console errors**: Browser console is clean

### ✅ Build Success Test
```bash
npm run build
# ✅ Should complete with no errors
# ✅ Should generate dist/ folder
```

## 2️⃣ Error Scenario Tests (10 min)

### ❌ Test 1: Missing Translation Key

**Setup:**
1. Edit `src/content/i18nUI/zh.json`
2. Remove this line: `"home": "Home",` from navigation section
3. Save the file

**Test:**
```bash
npm run build
```

**Expected Results:**
- [ ] ❌ Build fails with exit code 1
- [ ] 📝 Error message includes "Key 'navigation.home' not found for locale 'zh'"
- [ ] 📝 Error provides fix instructions
- [ ] 📝 Error shows file path: `src/content/i18nUI/zh.json`

**Cleanup:**
- Restore the removed line: `"home": "Home",`

### ❌ Test 2: Missing Nested Key

**Setup:**
1. Edit `src/content/i18nUI/es.json`
2. Remove this line: `"title": "Page Not Found",` from error.404 section
3. Save the file

**Test:**
```bash
npm run build
```

**Expected Results:**
- [ ] ❌ Build fails with detailed error
- [ ] 📝 Error message mentions "error.404.title" 
- [ ] 📝 Error specifies locale "es"
- [ ] 📝 Instructions to fix the missing key

**Cleanup:**
- Restore the removed line in error.404 section

### ❌ Test 3: Missing Language File

**Setup:**
1. Rename `src/content/i18nUI/fr.json` to `src/content/i18nUI/fr.json.backup`

**Test:**
```bash
npm run build
```

**Expected Results:**
- [ ] ❌ Build fails immediately
- [ ] 📝 Error mentions missing French translation file
- [ ] 📝 Instructions to create `src/content/i18nUI/fr.json`
- [ ] 📝 Suggestion to copy from en.json template

**Cleanup:**
- Rename back: `src/content/i18nUI/fr.json.backup` → `src/content/i18nUI/fr.json`

### ❌ Test 4: Invalid JSON Syntax

**Setup:**
1. Edit `src/content/i18nUI/de.json`
2. Remove the last closing brace `}` from the file
3. Save the file

**Test:**
```bash
npm run build
```

**Expected Results:**
- [ ] ❌ Build fails with JSON parsing error
- [ ] 📝 Error indicates JSON syntax issue
- [ ] 📝 Error shows problematic file

**Cleanup:**
- Add back the closing brace `}`

## 3️⃣ Development Server Tests (5 min)

### 🔧 Live Error Testing

**Setup:**
1. Ensure `npm run dev` is running
2. Edit `src/content/i18nUI/ja.json`
3. Remove `"games": "Games",` from navigation

**Test:**
1. Visit `http://localhost:4321/ja/`
2. Check browser console
3. Check terminal output

**Expected Results:**
- [ ] 🚨 Browser shows error or broken navigation
- [ ] 📝 Console shows translation error
- [ ] 📝 Terminal shows error details
- [ ] 🔄 Hot reload triggers error immediately

**Cleanup:**
- Restore the line: `"games": "Games",`
- Verify page loads correctly after fix

## 4️⃣ Component Integration Tests (5 min)

### 🧩 Navigation Component

**Test all language versions:**
- [ ] English: `http://localhost:4321/`
- [ ] Chinese: `http://localhost:4321/zh/`
- [ ] Spanish: `http://localhost:4321/es/`
- [ ] French: `http://localhost:4321/fr/`
- [ ] German: `http://localhost:4321/de/`
- [ ] Japanese: `http://localhost:4321/ja/`
- [ ] Korean: `http://localhost:4321/ko/`

**For each language, verify:**
- [ ] Navigation menu displays properly
- [ ] All menu items are translated (not in English)
- [ ] Language selector works
- [ ] No "undefined" or empty text

### 🧩 Footer Component

**For each language, check footer contains:**
- [ ] Copyright text (© 2025, not 2024)
- [ ] Legal links translated
- [ ] Contact information present
- [ ] No hardcoded English text

## 5️⃣ Fallback System Tests (5 min)

### 🔄 English Fallback Test

**Setup:**
1. Remove `"subtitle": "..."` from `src/content/i18nUI/ko.json` hero section
2. Keep the key in `src/content/i18nUI/en.json`

**Test:**
```bash
npm run build
```

**Expected Results:**
- [ ] ❌ Build fails (no silent fallback to English)
- [ ] 📝 Error mentions Korean locale missing key
- [ ] 📝 Error indicates English fallback was attempted
- [ ] 📝 Clear instructions to fix Korean file

### 🔄 Double Fallback Failure Test

**Setup:**
1. Remove `"copyright": "..."` from both `en.json` and `zh.json` footer sections

**Test:**
```bash
npm run build
```

**Expected Results:**
- [ ] ❌ Build fails with comprehensive error
- [ ] 📝 Error mentions both target locale and English fallback failed
- [ ] 📝 Instructions to fix both files
- [ ] 📝 No silent degradation

## 6️⃣ Production Build Validation (3 min)

### 🚀 Final Validation

**Restore all files to original state, then:**

```bash
# Clean build
rm -rf dist/
npm run build

# Verify success
echo "Build exit code: $?"
```

**Expected Results:**
- [ ] ✅ Build completes successfully (exit code 0)
- [ ] 📁 `dist/` folder created with all files
- [ ] 🌐 All language versions generated
- [ ] 🔍 No error messages in output

## ✅ Completion Checklist

After running all tests:

- [ ] **All translation files restored** to original state
- [ ] **Build succeeds** with complete translations
- [ ] **No console errors** on any language pages
- [ ] **Error messages are helpful** when translations missing
- [ ] **No hardcoded English text** appears in non-English locales
- [ ] **Build fails fast** with incomplete translations
- [ ] **Development experience improved** with clear error messages

## 🚨 If Any Test Fails

### Common Issues:
1. **Build succeeds when it should fail**: Check if fail-fast logic is properly implemented
2. **Silent English fallbacks**: Verify hardcoded fallback was removed
3. **Unclear error messages**: Check error message formatting in throwTranslationError
4. **Build fails with complete translations**: Check for JSON syntax errors

### Next Steps:
1. Review `src/i18n/utils.ts` implementation
2. Check `getTranslation` function logic
3. Verify `throwTranslationError` function
4. Test with minimal translation files

---

## 📊 Test Results Log

Date: _____________
Tester: _____________

| Test | Status | Notes |
|------|--------|-------|
| Normal Operation | ⏳ | |
| Missing Translation Key | ⏳ | |
| Missing Nested Key | ⏳ | |
| Missing Language File | ⏳ | |
| Invalid JSON Syntax | ⏳ | |
| Development Server Errors | ⏳ | |
| Component Integration | ⏳ | |
| Fallback System | ⏳ | |
| Production Build | ⏳ | |

**Overall Result: ⏳ PENDING**

---

*Expected completion time: 30 minutes*  
*Prerequisites: Node.js, npm, text editor*