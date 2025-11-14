with open('index.js', 'r') as f:
    lines = f.readlines()

# Fix movie route - swap lines 303 and 304 (0-indexed: 302, 303)
if 'detectEntryType(actualSlug)' in lines[303] and 'findActualSlug' in lines[304]:
    lines[303], lines[304] = lines[304], lines[303]

# Fix episode route - move actualSlug to line 317 (after destructuring)
# Find the actualSlug line and remove it
actualSlug_line = None
for i in range(315, 320):
    if 'const actualSlug' in lines[i]:
        actualSlug_line = lines.pop(i)
        break

# Insert it after the destructuring (line 316, which is now 315 after pop)
if actualSlug_line:
    lines.insert(317, actualSlug_line)

with open('index.js', 'w') as f:
    f.writelines(lines)
    
print("Fixed!")
