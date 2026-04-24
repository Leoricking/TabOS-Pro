from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

from html_generator import write_html


DATE_PATTERNS = [
    re.compile(r"^\s*//\s*(\d{4}/\d{1,2}/\d{1,2})"),
    re.compile(r"^\s*//\s*(\d{8})"),
    re.compile(r"^\s*(\d{4}/\d{1,2}/\d{1,2})"),
    re.compile(r"^\s*(\d{4}-\d{1,2}-\d{1,2})"),
    re.compile(r"^\s*//\s*(\d{4}/\d{1,2})"),
]

IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

COMMAND_PREFIXES = (
    "sudo ",
    "cd ",
    "ls ",
    "cat ",
    "grep ",
    "find ",
    "vim ",
    "vi ",
    "nano ",
    "python ",
    "python3 ",
    "pip ",
    "pip3 ",
    "git ",
    "scp ",
    "ssh ",
    "ifconfig ",
    "ip ",
    "route ",
    "ethtool ",
    "lspci ",
    "lsblk",
    "dmidecode",
    "nvme ",
    "fio ",
    "systemctl ",
    "iptables ",
    "firewall-cmd ",
    "modinfo ",
    "dmesg ",
    "ipmitool ",
    "fwupd_util.sh",
    "boot_util.sh",
    "power_util.sh",
    "arcconf ",
    "efibootmgr ",
    "flashrom ",
    "meson ",
    "docker ",
    "watch ",
    "mount ",
    "umount ",
    "uname ",
    "dpkg ",
    "rpm ",
    "yum ",
    "dnf ",
    "apt ",
    "apt-get ",
    "netplan ",
    "bcmsh",
    "devmem ",
    "minicom ",
)

TODO_KEYWORDS = [
    "待辦",
    "待解決",
    "todo",
    "tbd",
    "確認",
    "請",
    "需要",
    "目標",
    "check list",
    "checklist",
    "plan",
]

CATEGORY_RULES = [
    ("BIOS", ["bios", "uefi", "grub", "flashrom", "afu", "dmi", "smbios", "pxe"]),
    ("BMC", ["bmc", "ipmi", "redfish", "openbmc", "kvm", "fwupd_util", "boot_util", "power_util"]),
    ("RDMA", ["rdma", "roce", "infiniband", "perftest", "ib_write", "ib_read", "ib_send", "rccl", "hccl"]),
    ("Liqid", ["liqid", "cdi", "director", "rediscover", "restart fabric", "gen5 hba"]),
    ("Network", ["network", "sonic", "vlan", "route", "gateway", "ifconfig", "ethtool", "switch", "qsfp", "cfp", "zr+", "link up"]),
    ("Storage", ["nvme", "ssd", "spdk", "nvmf", "fio", "raid", "arcconf", "lsblk"]),
    ("GPU", ["gaudi", "habana", "amd", "rocm", "nvidia", "gpu", "mi300", "mi325", "h100"]),
    ("Travel / Expense", ["出差", "報帳", "住宿", "高鐵", "交通費", "膳食費"]),
    ("Project", ["iown", "ntt", "ctc", "smart city", "nchc", "慈濟", "training", "bom"]),
]


def normalize_date(raw: str) -> str:
    text = raw.strip().replace("-", "/")

    if re.fullmatch(r"\d{8}", text):
        return f"{text[0:4]}/{text[4:6]}/{text[6:8]}"

    parts = text.split("/")
    if len(parts) == 3:
        y, m, d = parts
        return f"{int(y):04d}/{int(m):02d}/{int(d):02d}"

    if len(parts) == 2:
        y, m = parts
        return f"{int(y):04d}/{int(m):02d}"

    return text


def detect_date(line: str) -> str | None:
    for pattern in DATE_PATTERNS:
        match = pattern.search(line)
        if match:
            return normalize_date(match.group(1))
    return None


def extract_ips(line: str) -> list[str]:
    return IP_RE.findall(line)


def is_command(line: str) -> bool:
    stripped = line.strip()

    if not stripped:
        return False

    lower = stripped.lower()

    if lower.startswith(COMMAND_PREFIXES):
        return True

    if stripped.startswith("./"):
        return True

    if " | grep " in lower:
        return True

    if " 2>&1 | tee " in lower:
        return True

    return False


def is_todo(line: str) -> bool:
    lower = line.lower()
    return any(keyword.lower() in lower for keyword in TODO_KEYWORDS)


def detect_category(line: str) -> str:
    lower = line.lower()

    for category, keywords in CATEGORY_RULES:
        if any(keyword.lower() in lower for keyword in keywords):
            return category

    if is_command(line):
        return "Command"

    return "General"


def should_skip(line: str) -> bool:
    stripped = line.strip()

    if not stripped:
        return True

    if stripped in {"{", "}", "///////"}:
        return True

    return False


def parse_worklog(text: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    current_date = "未分類日期"

    for index, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.rstrip()

        detected = detect_date(line)
        if detected:
            current_date = detected

        if should_skip(line):
            continue

        items.append({
            "id": f"log_{index}",
            "date": current_date,
            "text": line.strip(),
            "category": detect_category(line),
            "ips": extract_ips(line),
            "is_command": is_command(line),
            "is_todo": is_todo(line),
            "edited": False,
        })

    return items


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python tools/worklog_parser.py <input_txt> [output_html]")
        return 1

    input_path = Path(sys.argv[1])

    if not input_path.exists():
        print(f"Input not found: {input_path}")
        return 1

    output_path = Path(sys.argv[2]) if len(sys.argv) >= 3 else Path("output/worklog.html")

    text = input_path.read_text(encoding="utf-8", errors="ignore")
    items = parse_worklog(text)
    write_html(items, output_path)

    print(f"OK: parsed {len(items)} items")
    print(f"HTML: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())