using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

internal static class Program
{
    private const string EnglishResource = "MDView.en-US.msi";
    private const string ChineseTransformResource = "MDView.zh-CN.mst";

    [DllImport("kernel32.dll")]
    private static extern ushort GetUserDefaultUILanguage();

    [STAThread]
    private static int Main(string[] args)
    {
        bool useChinese = (GetUserDefaultUILanguage() & 0x03ff) == 0x0004;
        string tempDirectory = Path.Combine(Path.GetTempPath(), "MDView-Setup-" + Guid.NewGuid().ToString("N"));
        string msiPath = Path.Combine(tempDirectory, "MDView.msi");
        string transformPath = Path.Combine(tempDirectory, "zh-CN.mst");

        try
        {
            Directory.CreateDirectory(tempDirectory);
            ExtractResource(EnglishResource, msiPath);
            if (useChinese)
            {
                ExtractResource(ChineseTransformResource, transformPath);
            }

            string forwardedArguments = args.Length == 0 ? string.Empty : " " + string.Join(" ", Array.ConvertAll(args, QuoteArgument));
            string transformArguments = useChinese ? " TRANSFORMS=" + QuoteArgument(transformPath) : string.Empty;
            var startInfo = new ProcessStartInfo
            {
                FileName = "msiexec.exe",
                Arguments = "/i " + QuoteArgument(msiPath) + transformArguments + forwardedArguments,
                UseShellExecute = false
            };

            using (Process process = Process.Start(startInfo))
            {
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception exception)
        {
            string title = useChinese ? "MDView 安装程序" : "MDView Setup";
            string message = useChinese
                ? "无法启动 MDView 安装程序。\n\n" + exception.Message
                : "MDView Setup could not be started.\n\n" + exception.Message;
            MessageBox.Show(message, title, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempDirectory))
                {
                    Directory.Delete(tempDirectory, true);
                }
            }
            catch
            {
                // Windows Installer may briefly retain a handle after exiting.
            }
        }
    }

    private static void ExtractResource(string resourceName, string destinationPath)
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
        using (Stream source = assembly.GetManifestResourceStream(resourceName))
        {
            if (source == null)
            {
                throw new InvalidOperationException("Embedded installer resource was not found: " + resourceName);
            }

            using (FileStream destination = File.Create(destinationPath))
            {
                source.CopyTo(destination);
            }
        }
    }

    private static string QuoteArgument(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "\"\"";
        }

        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }
}
