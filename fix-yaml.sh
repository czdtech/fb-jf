#!/bin/bash

cd "D:/Users/33267/Documents/GitHub/fb-jf/src/content/games"

# Function to fix a single file
fix_yaml_file() {
    local file="$1"
    echo "Processing $file"
    
    # Use sed to fix common YAML indentation issues
    sed -i '
        # Fix description blocks that start with >-
        /description: >-/{
            :loop
            n
            /^[[:space:]]*[a-zA-Z]/b end
            /^[[:space:]]*$/b loop
            s/^    /        /
            b loop
            :end
        }
    ' "$file" 2>/dev/null || true
}

# Fix all .md files in current directory
for file in *.md; do
    if [ -f "$file" ]; then
        fix_yaml_file "$file"
    fi
done

# Fix all .md files in subdirectories  
for dir in */; do
    if [ -d "$dir" ]; then
        for file in "$dir"*.md; do
            if [ -f "$file" ]; then
                fix_yaml_file "$file"
            fi
        done
    fi
done

echo "YAML fixing complete!"