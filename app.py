import argparse
import atexit
import ctypes
import json
import os
import queue
import random
import sys
import threading
import time
import traceback
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import ttk
except ImportError:  # pragma: no cover
    tk = None
    ttk = None

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

try:
    import schedule
except ImportError:  # pragma: no cover
    schedule = None

try:
    from win10toast import ToastNotifier
except ImportError:  # pragma: no cover
    ToastNotifier = None

try:
    import pystray
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    pystray = None
    Image = None
    ImageDraw = None

DATA_FILE = Path(__file__).resolve().parent / "data" / "doha_data.json"
CONFIG_FILE = Path(__file__).resolve().parent / "settings.json"
INSTANCE_LOCK_FILE = Path(__file__).resolve().parent / ".kabir_reminder.lock"
REMOTE_URL = "https://kabirdoheapi.vercel.app/api/couplets"
ACTIVE_POPUP = {"root": None, "popup": None}
POPUP_REQUEST_QUEUE = queue.Queue()
POPUP_UI_THREAD = None


def is_pid_running(pid):
    if not isinstance(pid, int):
        return False
    if pid <= 0:
        return False

    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False


def acquire_instance_lock():
    if INSTANCE_LOCK_FILE.exists():
        try:
            with INSTANCE_LOCK_FILE.open("r", encoding="utf-8") as handle:
                existing_pid = handle.read().strip()
            if existing_pid.isdigit():
                if not is_pid_running(int(existing_pid)):
                    try:
                        INSTANCE_LOCK_FILE.unlink()
                    except FileNotFoundError:
                        pass
                else:
                    return False
        except OSError:
            pass

    try:
        fd = os.open(INSTANCE_LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_RDWR)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(str(os.getpid()))
        return True
    except FileExistsError:
        return False


def release_instance_lock():
    try:
        INSTANCE_LOCK_FILE.unlink()
    except FileNotFoundError:
        pass


def load_settings():
    if not CONFIG_FILE.exists():
        return {"interval_hours": 1.0}

    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {"interval_hours": 1.0}

    if not isinstance(data, dict):
        return {"interval_hours": 1.0}

    interval = data.get("interval_hours", 1.0)
    try:
        interval_value = float(interval)
    except (TypeError, ValueError):
        interval_value = 1.0

    return {"interval_hours": max(0.25, interval_value)}


def save_settings(settings):
    try:
        with CONFIG_FILE.open("w", encoding="utf-8") as handle:
            json.dump(settings, handle, ensure_ascii=False, indent=2)
    except OSError:
        pass


def normalize_entry(entry):
    if not isinstance(entry, dict):
        return None

    doha = entry.get("doha") or entry.get("couplet") or entry.get("text") or ""
    meaning = (
        entry.get("meaning")
        or entry.get("meaning_hindi")
        or entry.get("explanation")
        or "सत्य को समझें और अपने जीवन में अपनाएँ।"
    )
    source = entry.get("source") or entry.get("author") or "Kabir"

    if not doha.strip():
        return None

    return {
        "source": str(source).strip() or "Kabir",
        "doha": doha.strip(),
        "meaning": meaning.strip(),
    }


def load_local_entries():
    if not DATA_FILE.exists():
        return []

    try:
        with DATA_FILE.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return []

    if not isinstance(data, list):
        return []

    entries = [normalize_entry(item) for item in data]
    return [item for item in entries if item is not None]


def fetch_remote_entries():
    if requests is None:
        return []

    try:
        response = requests.get(REMOTE_URL, timeout=10)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    if not isinstance(payload, list):
        return []

    entries = [normalize_entry(item) for item in payload]
    return [item for item in entries if item is not None]


def get_entries():
    entries = load_local_entries()
    if entries:
        return entries

    entries = fetch_remote_entries()
    if entries:
        return entries

    return [
        {
            "source": "Kabir",
            "doha": "काल करे सो आज कर, आज करे सो अब।\nपल में परलय होयगी, बहुरि करेगा कब।",
            "meaning": "जो काम करना है, उसे अभी करो। समय पल में बदल जाता है; अवसर को व्यर्थ मत जाने दो।",
        },
        {
            "source": "Kabir",
            "doha": "बुरा जो देखन मैं चला, बुरा न मिलिया कोय।\nजो दृष्टी से मिलिया, तो मूरख होय।",
            "meaning": "यदि तुम दूसरों के दोष ढूंढते रहो, तो अपने भीतर की कमी भी नहीं देख पाओगे।",
        },
    ]


def close_active_popup():
    popup = ACTIVE_POPUP.get("popup")
    root = ACTIVE_POPUP.get("root")

    if popup is not None:
        try:
            popup.destroy()
        except Exception:
            pass
    if root is not None:
        try:
            root.destroy()
        except Exception:
            pass

    ACTIVE_POPUP["popup"] = None
    ACTIVE_POPUP["root"] = None


def ensure_popup_ui_thread():
    global POPUP_UI_THREAD

    if tk is None:
        return

    if POPUP_UI_THREAD is not None and POPUP_UI_THREAD.is_alive():
        return

    def _ui_loop():
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        def process_queue():
            while True:
                try:
                    queued_title, queued_message = POPUP_REQUEST_QUEUE.get_nowait()
                except queue.Empty:
                    break

                try:
                    if ACTIVE_POPUP.get("popup") is not None:
                        close_active_popup()

                    popup = tk.Toplevel(root)
                    popup.title(queued_title)
                    popup.overrideredirect(True)
                    popup.attributes("-topmost", True)
                    popup.attributes("-alpha", 1.0)
                    popup.configure(bg="#fff5dd")

                    ACTIVE_POPUP["root"] = root
                    ACTIVE_POPUP["popup"] = popup

                    screen_width = root.winfo_screenwidth()
                    popup_width = 560
                    popup_height = 320
                    x = max(20, screen_width - popup_width - 24)
                    y = 32
                    popup.geometry(f"{popup_width}x{popup_height}+{x}+{y}")
                    popup.deiconify()
                    popup.lift()
                    popup.minsize(500, 280)
                    popup.update_idletasks()
                    popup.update()

                    popup_frame = tk.Frame(popup, bg="#fff5dd", padx=16, pady=14, bd=1, relief="solid")
                    popup_frame.pack(fill="both", expand=True)
                    popup_frame.grid_propagate(False)

                    title_label = tk.Label(
                        popup_frame,
                        text=queued_title,
                        justify="left",
                        anchor="w",
                        font=("Segoe UI", 14, "bold"),
                        bg="#fff5dd",
                        fg="#4a2e16",
                    )
                    title_label.grid(row=0, column=0, sticky="ew", pady=(0, 12))

                    content = tk.Label(
                        popup_frame,
                        text=queued_message,
                        justify="left",
                        anchor="nw",
                        wraplength=470,
                        font=("Segoe UI", 12),
                        bg="#fff5dd",
                        fg="#1f1f1f",
                        padx=2,
                        pady=12,
                    )
                    content.grid(row=1, column=0, sticky="nsew")

                    popup_frame.grid_rowconfigure(1, weight=1)
                    popup_frame.grid_columnconfigure(0, weight=1)

                    def close_current():
                        close_active_popup()

                    close_button = tk.Button(
                        popup_frame,
                        text="Close",
                        command=close_current,
                        bg="#d17b2c",
                        fg="white",
                        bd=0,
                        activebackground="#b86a24",
                        activeforeground="white",
                        font=("Segoe UI", 10, "bold"),
                        padx=16,
                        pady=7,
                    )
                    close_button.grid(row=2, column=0, sticky="e")
                    popup.protocol("WM_DELETE_WINDOW", close_current)
                    popup.focus_set()
                    popup.after(50, popup.focus_force)
                    popup.update_idletasks()
                    popup.update()
                except Exception:
                    traceback.print_exc()

            root.after(100, process_queue)

        root.after(100, process_queue)
        root.mainloop()

    POPUP_UI_THREAD = threading.Thread(target=_ui_loop, daemon=True)
    POPUP_UI_THREAD.start()


def show_popup_window(title, message):
    if tk is None:
        print(f"{title}\n{message}")
        return

    if ACTIVE_POPUP.get("popup") is not None:
        return

    ensure_popup_ui_thread()
    POPUP_REQUEST_QUEUE.put((title, message))
    print(f"Shown side popup: {title}")


def show_quote_once():
    entries = get_entries()
    if not entries:
        print("No quote entries available.")
        return

    entry = random.choice(entries)
    title = f"{entry['source']} Dohe"
    message = f"{entry['doha']}\n\nMeaning: {entry['meaning']}"

    try:
        show_popup_window(title, message)
    except Exception as exc:
        print(f"Reminder display failed: {exc}")
        print(f"{title}\n{message}")


class ReminderController:
    def __init__(self):
        self.stop_event = threading.Event()
        self.thread = None
        self.interval_hours = load_settings()["interval_hours"]

    def start(self, interval_hours):
        self.interval_hours = max(0.25, float(interval_hours))
        save_settings({"interval_hours": self.interval_hours})

        if self.thread is not None and self.thread.is_alive():
            return

        self.stop_event.clear()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        if self.thread is not None and self.thread.is_alive():
            self.thread.join(timeout=2)

    def _loop(self):
        if schedule is None:
            print("The 'schedule' package is not installed. Install requirements first.")
            return

        schedule.clear()
        schedule.every(self.interval_hours).hours.do(show_quote_once)

        while not self.stop_event.is_set():
            schedule.run_pending()
            time.sleep(30)


controller = ReminderController()


def create_tray_icon_image():
    if Image is None or ImageDraw is None:
        return None

    image = Image.new("RGB", (64, 64), color=(26, 113, 184))
    draw = ImageDraw.Draw(image)
    draw.rectangle((8, 8, 56, 56), fill=(16, 71, 134))
    draw.text((18, 20), "क", fill=(255, 255, 255))
    return image


def set_windows_startup(enabled):
    if os.name != "nt":
        return False

    try:
        import winreg
    except ImportError:
        return False

    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    value_name = "KabirReminderApp"
    exe_path = sys.executable
    app_path = str(Path(__file__).resolve())
    value = f'"{exe_path}" "{app_path}" --tray'

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ) as key:
            try:
                current_value, _ = winreg.QueryValueEx(key, value_name)
            except FileNotFoundError:
                current_value = None
    except OSError:
        current_value = None

    if enabled:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, value_name, 0, winreg.REG_SZ, value)
        return True

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as key:
            try:
                winreg.DeleteValue(key, value_name)
            except FileNotFoundError:
                pass
        return True
    except OSError:
        return False


class SettingsWindow:
    def __init__(self, root):
        self.root = root
        self.root.title("Kabir Reminder Settings")
        self.root.geometry("420x220")

        self.interval_var = tk.StringVar(value=str(controller.interval_hours))

        frame = ttk.Frame(root, padding=16)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Reminder Interval (hours)", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        ttk.Entry(frame, textvariable=self.interval_var, width=20).pack(anchor="w", pady=(6, 14))

        ttk.Label(
            frame,
            text="Set how often the app should show a Kabir doha or a Tulsidas quote.",
            wraplength=360,
            justify="left",
        ).pack(anchor="w")

        button_frame = ttk.Frame(frame)
        button_frame.pack(anchor="w", pady=(18, 0))

        ttk.Button(button_frame, text="Show Now", command=show_quote_once).pack(side="left", padx=(0, 10))
        ttk.Button(button_frame, text="Start", command=self.start).pack(side="left", padx=(0, 10))
        ttk.Button(button_frame, text="Stop", command=self.stop).pack(side="left")

        ttk.Label(frame, text="Tip: Use 0.25 for 15 minutes, 1 for 1 hour, 2 for 2 hours.", foreground="#444").pack(anchor="w", pady=(16, 0))

    def start(self):
        try:
            hours = float(self.interval_var.get())
        except ValueError:
            hours = 1.0

        controller.start(max(0.25, hours))
        self.root.title(f"Kabir Reminder Settings - {controller.interval_hours} hours")

    def stop(self):
        controller.stop()
        self.root.title("Kabir Reminder Settings")


def run_ui():
    if tk is None:
        print("Tkinter is not available in this environment.")
        return

    root = tk.Tk()
    SettingsWindow(root)
    root.mainloop()


def run_tray():
    if pystray is None:
        print("Pystray is not installed. Please install requirements first.")
        return

    controller.start(controller.interval_hours)
    show_quote_once()
    tray_image = create_tray_icon_image()

    def show_now():
        show_quote_once()

    def on_startup_enable():
        set_windows_startup(True)

    def on_startup_disable():
        set_windows_startup(False)

    def on_exit():
        controller.stop()
        tray_icon.stop()

    tray_icon = pystray.Icon("KabirReminder", tray_image, "Kabir Reminder")
    tray_icon.menu = pystray.Menu(
        pystray.MenuItem("Show quote", show_now),
        pystray.MenuItem("Start reminder", lambda: controller.start(controller.interval_hours)),
        pystray.MenuItem("Stop reminder", controller.stop),
        pystray.MenuItem("Enable startup", on_startup_enable),
        pystray.MenuItem("Disable startup", on_startup_disable),
        pystray.MenuItem("Exit", on_exit),
    )
    tray_icon.run()


def run_scheduler(interval_hours=1):
    if schedule is None:
        print("The 'schedule' package is not installed. Install requirements first.")
        return

    controller.start(interval_hours)
    while not controller.stop_event.is_set():
        time.sleep(30)


def main():
    parser = argparse.ArgumentParser(description="Kabir dohe reminder app")
    parser.add_argument("--once", action="store_true", help="show one quote and exit")
    parser.add_argument("--interval-hours", type=float, default=None, help="hours between toasts")
    parser.add_argument("--ui", action="store_true", help="open the small settings window")
    parser.add_argument("--tray", action="store_true", help="run in tray mode silently in the background")
    parser.add_argument("--install-startup", action="store_true", help="add the app to Windows startup")
    parser.add_argument("--remove-startup", action="store_true", help="remove the app from Windows startup")
    args = parser.parse_args()

    if args.once:
        show_quote_once()
        return

    if not acquire_instance_lock():
        print("Another Kabir reminder instance is already running.")
        return

    atexit.register(release_instance_lock)

    if args.install_startup:
        print(f"Startup enabled: {set_windows_startup(True)}")
        return

    if args.remove_startup:
        print(f"Startup disabled: {set_windows_startup(False)}")
        return

    if args.tray:
        run_tray()
        return

    if args.ui:
        run_ui()
        return

    if args.interval_hours is not None:
        run_scheduler(interval_hours=args.interval_hours)
        return

    run_tray()


if __name__ == "__main__":
    main()
