"""
One-click launcher for BengalGrid AI Web Application
Automatically resolves Node.js path and launches the Vite server.
"""
import os
import sys
import subprocess
import webbrowser
import time
import urllib.request
import threading

NODE_PATH = r"C:\Program Files\nodejs"

def wait_and_open_browser(url="http://localhost:3000", max_wait_sec=15):
    """Actively polls the dev server until it responds before opening the browser."""
    start_time = time.time()
    while time.time() - start_time < max_wait_sec:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck"})
            with urllib.request.urlopen(req, timeout=1) as resp:
                if resp.status == 200:
                    print(f"\n[SUCCESS] Vite server is ready and responsive in {round(time.time() - start_time, 2)}s!")
                    print(f"[INFO] Opening dashboard in browser: {url}\n")
                    webbrowser.open(url)
                    return
        except Exception:
            time.sleep(0.3)
    # Fallback if timeout reached
    print(f"\n[INFO] Opening dashboard in browser: {url}\n")
    webbrowser.open(url)

def main():
    print("=" * 55)
    print(" Starting BengalGrid AI Smart Grid Digital Twin")
    print("=" * 55)

    # Ensure Node.js is in PATH
    if os.path.exists(NODE_PATH) and NODE_PATH not in os.environ.get("PATH", ""):
        os.environ["PATH"] = NODE_PATH + os.pathsep + os.environ.get("PATH", "")

    npm_exec = os.path.join(NODE_PATH, "npm.cmd") if os.path.exists(os.path.join(NODE_PATH, "npm.cmd")) else "npm"

    print(f"\n[INFO] Launching Vite server using: {npm_exec}")
    print("[INFO] Dashboard will be live at: http://localhost:3000\n")

    try:
        proc = subprocess.Popen([npm_exec, "run", "dev"], cwd=os.path.dirname(os.path.abspath(__file__)))
        # Asynchronously wait for Vite to be responsive before popping open browser
        threading.Thread(target=wait_and_open_browser, daemon=True).start()
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping server...")
    except Exception as e:
        print(f"[ERROR] Failed to launch: {e}")

if __name__ == "__main__":
    main()
