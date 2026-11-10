using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using System.Drawing.Drawing2D;
using Microsoft.Win32;

namespace HotelCentralInstaller
{
    public class InstallerForm : Form
    {
        private TextBox txtDest;
        private Button btnBrowse;
        private CheckBox chkDesktop;
        private CheckBox chkStartMenu;
        private CheckBox chkLaunch;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnInstall;
        private Button btnCancel;
        private bool isInstalling = false;
        private bool installFinished = false;
        private Bitmap logoBitmap = null;

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Instalador - Hotel Central 2 e Anexo";
            this.Size = new Size(540, 480);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            this.BackColor = Color.FromArgb(248, 250, 252);

            // Set Form Icon from embedded exe icon
            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            // Load logo image from embedded resource
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("logo.png"))
                {
                    if (s != null)
                    {
                        logoBitmap = new Bitmap(s);
                    }
                }
            }
            catch { }

            // Header Banner
            Panel header = new Panel();
            header.Dock = DockStyle.Top;
            header.Height = 90;
            header.Paint += delegate(object sender, PaintEventArgs e)
            {
                using (LinearGradientBrush brush = new LinearGradientBrush(header.ClientRectangle,
                    Color.FromArgb(30, 58, 138), Color.FromArgb(29, 78, 216), LinearGradientMode.Horizontal))
                {
                    e.Graphics.FillRectangle(brush, header.ClientRectangle);
                }

                if (logoBitmap != null)
                {
                    e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    int logoW = 160;
                    int logoH = (int)(logoW * ((double)logoBitmap.Height / logoBitmap.Width));
                    int logoY = (header.Height - logoH) / 2;
                    e.Graphics.DrawImage(logoBitmap, header.Width - logoW - 20, logoY, logoW, logoH);
                }
            };

            Label lblTitle = new Label();
            lblTitle.Text = "Hotel Central 2 e Anexo";
            lblTitle.Font = new Font("Segoe UI", 15F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.BackColor = Color.Transparent;
            lblTitle.Location = new Point(22, 16);
            lblTitle.AutoSize = true;
            header.Controls.Add(lblTitle);

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "Assistente de Instalação no Computador";
            lblSubtitle.Font = new Font("Segoe UI", 9.5F);
            lblSubtitle.ForeColor = Color.FromArgb(191, 219, 254);
            lblSubtitle.BackColor = Color.Transparent;
            lblSubtitle.Location = new Point(24, 48);
            lblSubtitle.AutoSize = true;
            header.Controls.Add(lblSubtitle);

            this.Controls.Add(header);

            // Main Content Area
            int top = 110;

            Label lblDest = new Label();
            lblDest.Text = "Pasta de destino para instalação:";
            lblDest.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblDest.ForeColor = Color.FromArgb(51, 65, 85);
            lblDest.Location = new Point(24, top);
            lblDest.AutoSize = true;
            this.Controls.Add(lblDest);

            top += 24;

            txtDest = new TextBox();
            txtDest.Text = @"C:\HotelCentral";
            txtDest.Location = new Point(24, top);
            txtDest.Size = new Size(375, 26);
            txtDest.Font = new Font("Segoe UI", 9.5F);
            this.Controls.Add(txtDest);

            btnBrowse = new Button();
            btnBrowse.Text = "Procurar...";
            btnBrowse.Location = new Point(410, top - 1);
            btnBrowse.Size = new Size(95, 28);
            btnBrowse.Click += delegate
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Selecione a pasta de instalação:";
                    fbd.SelectedPath = txtDest.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtDest.Text = fbd.SelectedPath;
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            top += 42;

            Label lblSpace = new Label();
            lblSpace.Text = "Espaço necessário em disco: aproximadamente 250 MB";
            lblSpace.ForeColor = Color.FromArgb(100, 116, 139);
            lblSpace.Font = new Font("Segoe UI", 8.5F);
            lblSpace.Location = new Point(24, top);
            lblSpace.AutoSize = true;
            this.Controls.Add(lblSpace);

            top += 30;

            // Options Group
            GroupBox grpOptions = new GroupBox();
            grpOptions.Text = "Opções Adicionais";
            grpOptions.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            grpOptions.ForeColor = Color.FromArgb(51, 65, 85);
            grpOptions.Location = new Point(24, top);
            grpOptions.Size = new Size(480, 115);

            chkDesktop = new CheckBox();
            chkDesktop.Text = "Criar atalho na Área de Trabalho com o ícone do hotel";
            chkDesktop.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            chkDesktop.Checked = true;
            chkDesktop.Location = new Point(18, 26);
            chkDesktop.AutoSize = true;
            grpOptions.Controls.Add(chkDesktop);

            chkStartMenu = new CheckBox();
            chkStartMenu.Text = "Criar atalho no Menu Iniciar";
            chkStartMenu.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            chkStartMenu.Checked = true;
            chkStartMenu.Location = new Point(18, 54);
            chkStartMenu.AutoSize = true;
            grpOptions.Controls.Add(chkStartMenu);

            chkLaunch = new CheckBox();
            chkLaunch.Text = "Iniciar o Hotel Central ao finalizar";
            chkLaunch.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            chkLaunch.Checked = true;
            chkLaunch.Location = new Point(18, 82);
            chkLaunch.AutoSize = true;
            grpOptions.Controls.Add(chkLaunch);

            this.Controls.Add(grpOptions);

            top += 126;

            // Progress & Status
            lblStatus = new Label();
            lblStatus.Text = "Pronto para iniciar a instalação.";
            lblStatus.ForeColor = Color.FromArgb(71, 85, 105);
            lblStatus.Location = new Point(24, top);
            lblStatus.Size = new Size(480, 20);
            this.Controls.Add(lblStatus);

            top += 22;

            progressBar = new ProgressBar();
            progressBar.Location = new Point(24, top);
            progressBar.Size = new Size(480, 16);
            this.Controls.Add(progressBar);

            top += 28;

            // Bottom Buttons
            btnCancel = new Button();
            btnCancel.Text = "Cancelar";
            btnCancel.Size = new Size(95, 32);
            btnCancel.Location = new Point(410, top);
            btnCancel.Click += delegate
            {
                if (isInstalling)
                {
                    MessageBox.Show("Aguarde a finalização da extração.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }
                this.Close();
            };
            this.Controls.Add(btnCancel);

            btnInstall = new Button();
            btnInstall.Text = "Instalar";
            btnInstall.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnInstall.ForeColor = Color.White;
            btnInstall.BackColor = Color.FromArgb(37, 99, 235);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Size = new Size(110, 32);
            btnInstall.Location = new Point(290, top);
            btnInstall.Click += delegate { DoInstall(); };
            this.Controls.Add(btnInstall);
        }

        private void DoInstall()
        {
            if (installFinished)
            {
                this.Close();
                return;
            }

            if (isInstalling) return;

            string targetDir = txtDest.Text.Trim();
            if (string.IsNullOrEmpty(targetDir))
            {
                MessageBox.Show("Por favor, informe uma pasta de instalação válida.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            isInstalling = true;
            txtDest.Enabled = false;
            btnBrowse.Enabled = false;
            chkDesktop.Enabled = false;
            chkStartMenu.Enabled = false;
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;

            Thread worker = new Thread(delegate()
            {
                try
                {
                    SetStatus("Preparando diretório de instalação...", 5);
                    if (!Directory.Exists(targetDir))
                    {
                        Directory.CreateDirectory(targetDir);
                    }

                    // Locate payload.zip
                    SetStatus("Localizando pacote do sistema...", 10);
                    string tempZip = Path.Combine(Path.GetTempPath(), "hotel_setup_" + Guid.NewGuid().ToString("N") + ".zip");
                    bool tempZipCreated = false;

                    Assembly asm = Assembly.GetExecutingAssembly();
                    Stream resStream = asm.GetManifestResourceStream("payload.zip");

                    if (resStream != null)
                    {
                        SetStatus("Extraindo dados do pacote do sistema...", 15);
                        using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                        {
                            byte[] buffer = new byte[65536];
                            int read;
                            long totalBytes = resStream.Length;
                            long copied = 0;
                            while ((read = resStream.Read(buffer, 0, buffer.Length)) > 0)
                            {
                                fs.Write(buffer, 0, read);
                                copied += read;
                                if (totalBytes > 0)
                                {
                                    int pct = 15 + (int)((copied * 25) / totalBytes);
                                    SetProgress(pct);
                                }
                            }
                        }
                        tempZipCreated = true;
                    }
                    else
                    {
                        string localZip = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "payload.zip");
                        if (File.Exists(localZip))
                        {
                            tempZip = localZip;
                        }
                        else
                        {
                            throw new FileNotFoundException("Arquivo payload.zip não foi encontrado.");
                        }
                    }

                    // Extract ZIP entries with progress
                    SetStatus("Instalando arquivos do Hotel Central...", 45);
                    using (ZipArchive archive = ZipFile.OpenRead(tempZip))
                    {
                        int total = archive.Entries.Count;
                        int count = 0;

                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            count++;
                            string completeFileName = Path.Combine(targetDir, entry.FullName);
                            string dir = Path.GetDirectoryName(completeFileName);

                            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                            {
                                Directory.CreateDirectory(dir);
                            }

                            if (!string.IsNullOrEmpty(entry.Name))
                            {
                                entry.ExtractToFile(completeFileName, true);
                            }

                            if (count % 30 == 0 || count == total)
                            {
                                int pct = 45 + (int)((count * 45) / total);
                                SetProgress(pct);
                            }
                        }
                    }

                    if (tempZipCreated && File.Exists(tempZip))
                    {
                        try { File.Delete(tempZip); } catch { }
                    }

                    // Create Shortcuts with icon
                    SetStatus("Configurando atalhos do sistema com o ícone oficial...", 92);
                    string exePath = Path.Combine(targetDir, "HotelCentral.exe");
                    string icoPath = Path.Combine(targetDir, "app.ico");

                    if (chkDesktop.Checked)
                    {
                        string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                        string desktopLnk = Path.Combine(desktopPath, "Hotel Central 2 e Anexo.lnk");
                        CreateShortcut(desktopLnk, exePath, targetDir, icoPath, "Hotel Central 2 e Anexo - Sistema de Gestão");
                    }

                    if (chkStartMenu.Checked)
                    {
                        string programsPath = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                        string menuLnk = Path.Combine(programsPath, "Hotel Central 2 e Anexo.lnk");
                        CreateShortcut(menuLnk, exePath, targetDir, icoPath, "Hotel Central 2 e Anexo - Sistema de Gestão");
                    }

                    // Register in Windows Control Panel (Add/Remove Programs)
                    try
                    {
                        using (RegistryKey parent = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall"))
                        {
                            using (RegistryKey appKey = parent.CreateSubKey("HotelCentral"))
                            {
                                appKey.SetValue("DisplayName", "Hotel Central 2 e Anexo");
                                appKey.SetValue("DisplayIcon", icoPath);
                                appKey.SetValue("DisplayVersion", "1.0.0");
                                appKey.SetValue("Publisher", "Hotel Central");
                                appKey.SetValue("InstallLocation", targetDir);
                                appKey.SetValue("UninstallString", "\"" + Path.Combine(targetDir, "Desinstalar.exe") + "\"");
                            }
                        }
                    }
                    catch { }

                    SetStatus("Instalação concluída com sucesso!", 100);

                    this.Invoke(new MethodInvoker(delegate()
                    {
                        installFinished = true;
                        isInstalling = false;
                        btnInstall.Text = "Concluir";
                        btnInstall.Enabled = true;
                        btnCancel.Visible = false;

                        if (chkLaunch.Checked)
                        {
                            try
                            {
                                Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = targetDir });
                            }
                            catch { }
                        }

                        MessageBox.Show(
                            "O Hotel Central 2 e Anexo foi instalado com sucesso!\n\nVocê já pode acessá-lo pelo atalho na Área de Trabalho com o ícone oficial do hotel.",
                            "Instalação Concluída",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information
                        );
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke(new MethodInvoker(delegate()
                    {
                        isInstalling = false;
                        btnInstall.Enabled = true;
                        btnCancel.Enabled = true;
                        txtDest.Enabled = true;
                        btnBrowse.Enabled = true;
                        SetStatus("Erro durante a instalação.", 0);
                        MessageBox.Show("Erro durante a instalação:\n" + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }));
                }
            });

            worker.IsBackground = true;
            worker.Start();
        }

        private void SetStatus(string text, int progress)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new MethodInvoker(delegate() { SetStatus(text, progress); }));
                return;
            }
            lblStatus.Text = text;
            progressBar.Value = Math.Max(0, Math.Min(100, progress));
        }

        private void SetProgress(int progress)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new MethodInvoker(delegate() { SetProgress(progress); }));
                return;
            }
            progressBar.Value = Math.Max(0, Math.Min(100, progress));
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string iconPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workingDir;

                if (File.Exists(iconPath))
                {
                    shortcut.IconLocation = iconPath;
                }
                else
                {
                    shortcut.IconLocation = targetPath + ",0";
                }

                shortcut.Description = description;
                shortcut.Save();
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}
