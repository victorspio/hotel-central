using System;
using System.IO;
using System.Diagnostics;
using System.Threading;
using System.Net;
using System.Windows.Forms;
using System.Drawing;

namespace HotelCentral
{
    static class Program
    {
        private static Process nodeProcess = null;
        private static NotifyIcon trayIcon = null;
        private static Mutex singleInstanceMutex = null;
        private static string appDir = "";

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Single instance lock
            bool isNewInstance;
            singleInstanceMutex = new Mutex(true, "HotelCentralSingleInstanceMutex_v1", out isNewInstance);
            if (!isNewInstance)
            {
                // App already running; open window and exit this duplicate process
                OpenAppWindow();
                return;
            }

            appDir = AppDomain.CurrentDomain.BaseDirectory;

            // Ensure Node is terminated when this application exits
            AppDomain.CurrentDomain.ProcessExit += delegate { StopNodeServer(); };
            Application.ApplicationExit += delegate { StopNodeServer(); };

            // Start Node backend
            bool started = StartNodeServer();
            if (!started)
            {
                return;
            }

            // Wait up to 15 seconds for server to be responsive
            WaitForServer("http://localhost:3001/health", 15);

            // Create Tray Icon
            SetupTray();

            // Open application window in Edge App Mode or Default Browser
            OpenAppWindow();

            // Run message loop for tray icon
            Application.Run();
        }

        private static bool StartNodeServer()
        {
            string nodeExe = Path.Combine(appDir, @"runtime\node.exe");
            if (!File.Exists(nodeExe))
            {
                nodeExe = "node";
            }

            string serverScript = Path.Combine(appDir, @"backend\src\server.js");
            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "Não foi possível encontrar o arquivo do servidor:\n" + serverScript,
                    "Erro ao Iniciar Hotel Central",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + serverScript + "\"";
                psi.WorkingDirectory = Path.Combine(appDir, "backend");
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                psi.EnvironmentVariables["NODE_ENV"] = "production";
                psi.EnvironmentVariables["PORT"] = "3001";

                string dbPath = Path.Combine(appDir, @"backend\prisma\hotel.db");
                psi.EnvironmentVariables["DATABASE_URL"] = "file:" + dbPath.Replace("\\", "/");

                nodeProcess = Process.Start(psi);
                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Erro ao inicializar o motor do sistema:\n" + ex.Message,
                    "Erro - Hotel Central",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }
        }

        private static void WaitForServer(string url, int timeoutSeconds)
        {
            DateTime start = DateTime.Now;
            while ((DateTime.Now - start).TotalSeconds < timeoutSeconds)
            {
                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                    request.Timeout = 800;
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if (response.StatusCode == HttpStatusCode.OK)
                        {
                            return;
                        }
                    }
                }
                catch
                {
                    // Still starting up...
                }
                Thread.Sleep(300);
            }
        }

        public static void OpenAppWindow()
        {
            string url = "http://localhost:3001";

            // Check for Microsoft Edge to run in native App Window Mode (clean borderless desktop app experience)
            string[] possibleEdgePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
            };

            foreach (string edgePath in possibleEdgePaths)
            {
                if (File.Exists(edgePath))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = edgePath;
                        psi.Arguments = "--app=\"" + url + "\" --window-size=1366,768";
                        Process.Start(psi);
                        return;
                    }
                    catch { }
                }
            }

            // Fallback to default browser
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao abrir a tela do sistema:\n" + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static void SetupTray()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Hotel Central 2 e Anexo";

            string icoPath = Path.Combine(appDir, "app.ico");
            if (File.Exists(icoPath))
            {
                try
                {
                    trayIcon.Icon = new Icon(icoPath);
                }
                catch
                {
                    try { trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
                    catch { trayIcon.Icon = SystemIcons.Application; }
                }
            }
            else
            {
                try { trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }

            ContextMenuStrip menu = new ContextMenuStrip();

            ToolStripMenuItem itemOpen = new ToolStripMenuItem("Abrir Hotel Central");
            itemOpen.Font = new Font(itemOpen.Font, FontStyle.Bold);
            itemOpen.Click += delegate { OpenAppWindow(); };

            ToolStripMenuItem itemRestart = new ToolStripMenuItem("Reiniciar Servidor");
            itemRestart.Click += delegate {
                StopNodeServer();
                Thread.Sleep(500);
                StartNodeServer();
                WaitForServer("http://localhost:3001/health", 10);
                OpenAppWindow();
            };

            ToolStripMenuItem itemExit = new ToolStripMenuItem("Encerrar Sistema");
            itemExit.Click += delegate {
                DialogResult dr = MessageBox.Show(
                    "Deseja realmente fechar o sistema Hotel Central?",
                    "Confirmar Saída",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );
                if (dr == DialogResult.Yes)
                {
                    StopNodeServer();
                    if (trayIcon != null)
                    {
                        trayIcon.Visible = false;
                        trayIcon.Dispose();
                    }
                    if (singleInstanceMutex != null)
                    {
                        singleInstanceMutex.ReleaseMutex();
                        singleInstanceMutex.Dispose();
                    }
                    Application.Exit();
                    Environment.Exit(0);
                }
            };

            menu.Items.Add(itemOpen);
            menu.Items.Add(itemRestart);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(itemExit);

            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += delegate { OpenAppWindow(); };
            trayIcon.Visible = true;
        }

        private static void StopNodeServer()
        {
            try
            {
                if (nodeProcess != null && !nodeProcess.HasExited)
                {
                    nodeProcess.Kill();
                    nodeProcess.WaitForExit(2000);
                }
            }
            catch { }
        }
    }
}

