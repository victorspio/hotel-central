using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using Microsoft.Win32;

namespace HotelCentral
{
    static class Uninstaller
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            DialogResult confirm = MessageBox.Show(
                "Deseja realmente desinstalar o Hotel Central 2 e Anexo do seu computador?",
                "Desinstalação - Hotel Central",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (confirm != DialogResult.Yes)
            {
                return;
            }

            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');

            // Ask to preserve database
            bool keepDb = false;
            string dbPath = Path.Combine(appDir, @"backend\prisma\hotel.db");
            if (File.Exists(dbPath))
            {
                DialogResult askDb = MessageBox.Show(
                    "Deseja fazer backup / preservar seu banco de dados (hotel.db) para não perder o histórico de clientes e hospedagens?",
                    "Preservar Dados",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );
                keepDb = (askDb == DialogResult.Yes);
                if (keepDb)
                {
                    try
                    {
                        string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                        string backupPath = Path.Combine(desktopPath, "hotel_backup_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".db");
                        File.Copy(dbPath, backupPath, true);
                        MessageBox.Show("Uma cópia do banco de dados foi salva na sua Área de Trabalho:\n" + backupPath, "Backup Salvo", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    catch { }
                }
            }

            // Kill running processes
            try
            {
                foreach (Process p in Process.GetProcessesByName("HotelCentral"))
                {
                    if (p.Id != Process.GetCurrentProcess().Id)
                    {
                        p.Kill();
                        p.WaitForExit(1500);
                    }
                }
            }
            catch { }

            // Remove Desktop shortcut
            try
            {
                string desktopShortcut = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                    "Hotel Central 2 e Anexo.lnk"
                );
                if (File.Exists(desktopShortcut)) File.Delete(desktopShortcut);
            }
            catch { }

            // Remove Start Menu shortcut
            try
            {
                string startMenuShortcut = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                    "Hotel Central 2 e Anexo.lnk"
                );
                if (File.Exists(startMenuShortcut)) File.Delete(startMenuShortcut);
            }
            catch { }

            // Remove Registry uninstall entry
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall", true))
                {
                    if (key != null) key.DeleteSubKeyTree("HotelCentral", false);
                }
            }
            catch { }

            // Self-delete folder via delayed cmd
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c timeout /t 2 /nobreak > nul & rd /s /q \"" + appDir + "\"";
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                Process.Start(psi);
            }
            catch { }

            MessageBox.Show(
                "O Hotel Central foi desinstalado com sucesso do seu computador.",
                "Desinstalação Concluída",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }
    }
}

