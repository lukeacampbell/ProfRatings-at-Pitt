# Professor Ratings Extension
[<u>Chrome Web Store</u>](https://chromewebstore.google.com/detail/dpoebnefgpfmbmpceddpdifljimmjnja?utm_source=item-share-cb)

A Chrome extension that displays Rate My Professors ratings directly on course registration pages by automatically matching instructor names with professor data.

## 🚀 Features

- **Real-time Rating Display**: Shows professor ratings as color-coded badges next to instructor names
- **Smart Name Matching**: Uses fuzzy matching algorithms to find professors even with slight name variations
- **Clickable Ratings**: Rating badges link directly to the professor's Rate My Professors page
- **Automatic Updates**: Monitors page changes and updates ratings dynamically
- **Background Processing**: Runs seamlessly without affecting page performance

## 📁 Project Structure

```
RMP Google Extension/
├── content.js          # Main extension logic
├── manifest.json       # Extension configuration  
├── ProfessorData.csv   # Professor ratings database
├── icon.png           # Extension icon
└── README.md          # This file
```

## 🔧 How It Works


The extension loads professor data from `ProfessorData.csv` and creates a lookup table for fast name matching.

### Name Matching Algorithm
- **Exact Match**: First tries to find exact name matches
- **Fuzzy Matching**: Uses Levenshtein distance algorithm for similar names
- **Prefix Matching**: Matches professors with similar first name prefixes
- **Similarity Threshold**: Accepts matches with ≥70% similarity

### Rating Badge System
| Rating Range | Color | Badge |
|-------------|-------|-------|
| ≥ 4.0 | 🟢 Green | High rating |
| 3.0-3.9 | 🟠 Orange | Medium rating |
| < 3.0 | 🔴 Red | Low rating |
| No data | ⚪ Gray | Unknown |

## 📊 Data Format

The `ProfessorData.csv` file should contain comma-separated values:

rating,professor_name,rmp_url


## ⚙️ Key Functions

### `processInstructor(cell)`
Core function that processes each instructor cell and adds rating badges

### `levenshtein(a, b)`
Calculates edit distance between strings for fuzzy name matching using dynamic programming

### `makeBadge(rating)`
Creates styled rating badges with appropriate colors and formatting

### `scanAll()`
Scans the entire page for instructor elements using `div[header="Instructor"]` selectors

### `commonPrefix(a, b)`
Finds common character prefixes between strings to improve name matching accuracy


## 🎨 Styling

Badges are styled with:
- Inline-block display
- 2px vertical, 6px horizontal padding
- 4px border radius
- White text on colored background
- 0.85em font size with 600 weight
