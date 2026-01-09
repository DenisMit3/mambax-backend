import os
import ast
import re
import datetime
from pathlib import Path

OUTPUT_FILE = Path("ARCHITECTURE.md")
IGNORE_DIRS = {'.git', '.idea', '.vscode', '.antigravity', 'node_modules', 'venv', 'env', '.venv', '__pycache__', 'dist', 'build', '.next', 'site-packages', '.vercel'}
IGNORE_FILES = {'package-lock.json', 'yarn.lock', 'context_map.py', OUTPUT_FILE.name, '.DS_Store'}
ICONS = {'.py': '🐍', '.js': '🟨', '.ts': '🟦', '.jsx': '⚛️', '.tsx': '⚛️', '.html': '🌐', '.json': '⚙️', '.md': '📝', '.css': '🎨'}

def get_file_metadata(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        tokens = int(len(content) / 4)
        desc = ""
        head = content[:1000]
        if path.suffix == '.py':
            try:
                doc = ast.get_docstring(ast.parse(head))
                if doc: desc = doc.strip().split('\n')[0]
            except: pass
        elif path.suffix in {'.js', '.ts', '.jsx', '.tsx', '.dart', '.java'}:
            match = re.search(r'^\s*(?://|/\*)\s*(.*?)(?:\*/|\n)', head, re.DOTALL | re.MULTILINE)
            if match: desc = match.group(1).replace('*', '').strip().split('\n')[0]
        return desc, tokens
    except: return "", 0

def generate_tree(dir_path, prefix="", level=0):
    if level > 5: return ""
    output = []
    try: items = sorted(list(dir_path.iterdir()))
    except: return ""
    
    dirs = [d for d in items if d.is_dir() and d.name not in IGNORE_DIRS]
    files = [f for f in items if f.is_file() and f.name not in IGNORE_FILES]
    
    for i, d in enumerate(dirs):
        is_last = (i == len(dirs) - 1) and not files
        output.append(f"{prefix}{'└── ' if is_last else '├── '}📂 **{d.name}/**")
        output.append(generate_tree(d, prefix + ('    ' if is_last else '│   '), level + 1))
        
    for i, f in enumerate(files):
        is_last = (i == len(files) - 1)
        desc, tokens = get_file_metadata(f)
        meta = f" _{desc}_ [`~{tokens} tok`]" if desc else f" [`~{tokens} tok`]"
        icon = ICONS.get(f.suffix.lower(), '📄')
        output.append(f"{prefix}{'└── ' if is_last else '├── '}{icon} `{f.name}`{meta}")
    return "\n".join(output)

def main():
    root = Path.cwd()
    tree = generate_tree(root)
    content = f"# 🗺️ Architecture Map\n> Updated: {datetime.datetime.now()}\n\n```text\n{root.name}/\n{tree}\n```"
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f: f.write(content)
    print(f"✅ Map updated: {OUTPUT_FILE}")

if __name__ == "__main__": main()
