import re
import json

def detect_category(line):
    l = line.lower()

    if "bios" in l: return "BIOS"
    if "rdma" in l: return "RDMA"
    if "bmc" in l: return "BMC"
    if "nvme" in l: return "Storage"
    if "ethtool" in l or "network" in l: return "Network"
    return "General"

def extract_ip(line):
    return re.findall(r'\b\d{1,3}(?:\.\d{1,3}){3}\b', line)

def extract_command(line):
    if any(cmd in line for cmd in ["sudo", "cd ", "ls ", "ip ", "ethtool", "nvme", "route"]):
        return True
    return False

def parse_worklog(text):
    lines = text.split("\n")
    data = []

    for line in lines:
        if not line.strip():
            continue

        item = {
            "text": line.strip(),
            "category": detect_category(line),
            "ips": extract_ip(line),
            "is_command": extract_command(line)
        }

        data.append(item)

    return data

if __name__ == "__main__":
    with open("command.txt", "r", encoding="utf-8") as f:
        txt = f.read()

    parsed = parse_worklog(txt)

    with open("worklog.json", "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)

    print("✅ parsed → worklog.json")